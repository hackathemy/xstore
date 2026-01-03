# XStore 리팩토링 구현 계획

## 개요

현재 Next.js API Routes + 네이티브 MOVE 결제 구조를 다음으로 변경:
- **NestJS 백엔드** (Monorepo 구조)
- **USDC 스테이블코인 결제**
- **x402 프로토콜 + Self-hosted Facilitator** (가스비 대납)
- **정산/환불 시스템**

---

## 1. 프로젝트 구조

```
xstore/
├── frontend/                 # Next.js 프론트엔드 (기존 app/ 이동)
│   ├── app/
│   ├── components/
│   ├── hooks/
│   └── package.json
│
├── backend/                  # NestJS 백엔드 (신규)
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/         # Privy 인증
│   │   │   ├── stores/       # 매장 관리
│   │   │   ├── tabs/         # 탭 관리
│   │   │   ├── payments/     # x402 결제
│   │   │   ├── facilitator/  # x402 Facilitator
│   │   │   ├── settlements/  # 정산
│   │   │   └── refunds/      # 환불
│   │   ├── common/
│   │   │   ├── guards/
│   │   │   ├── interceptors/
│   │   │   └── filters/
│   │   └── main.ts
│   ├── prisma/               # 공유 Prisma 스키마
│   └── package.json
│
├── contracts/                # Move 컨트랙트 (참조용)
│   └── # Movement Network의 기존 coin 모듈 사용
│       # 별도 커스텀 컨트랙트 불필요 (coin::transfer 활용)
│
└── packages/                 # 공유 패키지
    └── shared/               # 타입, 상수 등
```

---

## 2. x402 결제 흐름 (Self-hosted Facilitator)

### 2.1 기존 흐름 (직접 결제)
```
Client → Server(402) → Client(직접 전송) → Server(확인)
```

### 2.2 새로운 흐름 (x402 Fee Payer 트랜잭션)
```
1. Client: 결제 요청 (탭 닫기)
2. Server: 402 Payment Required + PaymentRequirements 반환
3. Client: Aptos SDK로 coin::transfer 트랜잭션 생성 (서명하지 않음)
4. Server → Facilitator: Fee Payer 트랜잭션 구성
   - Facilitator가 가스비 지불자(fee payer)로 설정
   - Payer와 Facilitator 모두 서명 필요
5. Client: 트랜잭션에 사용자 서명 추가
6. Facilitator: Fee Payer 서명 추가 후 트랜잭션 제출
   - coin::transfer 실행 (Client's USDC → Store Owner)
   - Facilitator가 가스비 부담
7. Server: 결제 완료 처리
```

### 2.3 핵심 컴포넌트

#### PaymentRequirements (402 응답)
```typescript
{
  x402Version: 1,
  accepts: [{
    scheme: "exact",
    network: "movement-testnet",
    maxAmountRequired: "10000000",  // 10 USDC (6 decimals)
    resource: "/api/tabs/{id}/close",
    description: "Tab payment",
    mimeType: "application/json",
    payTo: "0x...",  // Store owner address
    extra: {
      name: "USDC",
      version: "2",
      address: "0x...",  // USDC contract
      decimals: 6
    }
  }]
}
```

#### PaymentPayload (Fee Payer 트랜잭션)
```typescript
{
  x402Version: 1,
  scheme: "exact",
  network: "movement-testnet",
  payload: {
    // Move 트랜잭션 데이터
    transaction: {
      sender: "0x...",           // Payer (64 hex chars)
      recipient: "0x...",        // Store owner (64 hex chars)
      amount: "10000000",        // USDC amount
      coinType: "0x...::usdc::USDC"
    },
    feePayer: "0x...",           // Facilitator address
    expiresAt: "1735689600"
  }
}
```

---

## 3. 데이터베이스 스키마 변경

### 3.1 기존 스키마 유지 + 확장

```prisma
// 결제 정보 확장
model Payment {
  id              String        @id @default(cuid())
  tabId           String        @unique @map("tab_id")
  tab             Tab           @relation(fields: [tabId], references: [id])

  // 결제 정보
  amount          Decimal       @db.Decimal(20, 6)
  currency        String        @default("USDC")
  network         String        @default("movement-testnet")

  // x402 정보
  payerAddress    String        @map("payer_address")
  recipientAddress String       @map("recipient_address")
  paymentPayload  Json?         @map("payment_payload")

  // 트랜잭션
  txHash          String?       @map("tx_hash")
  gasUsed         String?       @map("gas_used")
  gasPaidBy       String?       @map("gas_paid_by")  // Facilitator address

  // 상태
  status          PaymentStatus @default(PENDING)

  createdAt       DateTime      @default(now()) @map("created_at")
  settledAt       DateTime?     @map("settled_at")

  settlement      Settlement?
  refund          Refund?

  @@map("payments")
}

enum PaymentStatus {
  PENDING
  VERIFIED
  SETTLED
  FAILED
  REFUNDED
}

// 정산
model Settlement {
  id              String           @id @default(cuid())
  paymentId       String           @unique @map("payment_id")
  payment         Payment          @relation(fields: [paymentId], references: [id])

  storeId         String           @map("store_id")
  store           Store            @relation(fields: [storeId], references: [id])

  amount          Decimal          @db.Decimal(20, 6)
  fee             Decimal          @db.Decimal(20, 6)  // 플랫폼 수수료
  netAmount       Decimal          @db.Decimal(20, 6)  // 실수령액

  txHash          String?          @map("tx_hash")
  status          SettlementStatus @default(PENDING)

  createdAt       DateTime         @default(now()) @map("created_at")
  settledAt       DateTime?        @map("settled_at")

  @@map("settlements")
}

enum SettlementStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

// 환불
model Refund {
  id              String        @id @default(cuid())
  paymentId       String        @unique @map("payment_id")
  payment         Payment       @relation(fields: [paymentId], references: [id])

  amount          Decimal       @db.Decimal(20, 6)
  reason          String?
  requestedBy     String        @map("requested_by")  // Store owner or admin

  txHash          String?       @map("tx_hash")
  status          RefundStatus  @default(PENDING)

  createdAt       DateTime      @default(now()) @map("created_at")
  processedAt     DateTime?     @map("processed_at")

  @@map("refunds")
}

enum RefundStatus {
  PENDING
  APPROVED
  PROCESSING
  COMPLETED
  REJECTED
}
```

---

## 4. NestJS 백엔드 모듈 설계

### 4.1 모듈 구조

```
src/
├── modules/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── guards/
│   │   │   ├── privy-auth.guard.ts
│   │   │   └── store-owner.guard.ts
│   │   └── strategies/
│   │       └── privy.strategy.ts
│   │
│   ├── stores/
│   │   ├── stores.module.ts
│   │   ├── stores.controller.ts
│   │   └── stores.service.ts
│   │
│   ├── tabs/
│   │   ├── tabs.module.ts
│   │   ├── tabs.controller.ts
│   │   └── tabs.service.ts
│   │
│   ├── payments/
│   │   ├── payments.module.ts
│   │   ├── payments.controller.ts
│   │   ├── payments.service.ts
│   │   ├── dto/
│   │   │   ├── payment-requirements.dto.ts
│   │   │   └── payment-payload.dto.ts
│   │   └── interceptors/
│   │       └── x402-payment.interceptor.ts
│   │
│   ├── facilitator/
│   │   ├── facilitator.module.ts
│   │   ├── facilitator.controller.ts
│   │   ├── facilitator.service.ts
│   │   └── blockchain/
│   │       └── movement.service.ts  # Aptos SDK 기반 Move 트랜잭션
│   │
│   ├── settlements/
│   │   ├── settlements.module.ts
│   │   ├── settlements.controller.ts
│   │   ├── settlements.service.ts
│   │   └── jobs/
│   │       └── settlement-processor.job.ts
│   │
│   └── refunds/
│       ├── refunds.module.ts
│       ├── refunds.controller.ts
│       └── refunds.service.ts
│
├── common/
│   ├── config/
│   │   ├── database.config.ts
│   │   └── blockchain.config.ts
│   ├── prisma/
│   │   └── prisma.service.ts
│   └── exceptions/
│       └── payment-required.exception.ts
│
└── main.ts
```

### 4.2 주요 API 엔드포인트

```
# Stores
GET    /api/stores
POST   /api/stores
GET    /api/stores/:id
PATCH  /api/stores/:id

# Tabs
GET    /api/tabs
POST   /api/tabs
GET    /api/tabs/:id
POST   /api/tabs/:id/items
POST   /api/tabs/:id/close      # x402 Payment Required

# Facilitator (내부)
GET    /api/facilitator/supported
POST   /api/facilitator/verify
POST   /api/facilitator/settle

# Settlements (Store Owner)
GET    /api/settlements
GET    /api/settlements/:id
POST   /api/settlements/request

# Refunds (Store Owner)
GET    /api/refunds
POST   /api/refunds
GET    /api/refunds/:id
PATCH  /api/refunds/:id/approve
PATCH  /api/refunds/:id/reject
```

---

## 5. Self-hosted Facilitator 구현

### 5.1 핵심 로직

```typescript
// facilitator.service.ts
@Injectable()
export class FacilitatorService {
  private account: Account;  // Facilitator 계정 (Aptos SDK - 가스비 지불용)

  async verify(payload: PaymentPayload, requirements: PaymentRequirements) {
    // 1. 서명 검증
    const isValid = await this.verifySignature(payload);

    // 2. 금액 확인
    const amountValid = this.validateAmount(payload, requirements);

    // 3. 만료 시간 확인
    const notExpired = this.checkExpiration(payload);

    return {
      isValid: isValid && amountValid && notExpired,
      payer: payload.payload.authorization.from
    };
  }

  async settle(payload: PaymentPayload, requirements: PaymentRequirements) {
    // 1. Fee Payer 트랜잭션 구성 (Aptos SDK)
    const transaction = await this.aptos.transaction.build.simple({
      sender: payload.payload.transaction.sender,
      withFeePayer: true,  // Facilitator가 가스비 지불
      data: {
        function: "0x1::coin::transfer",
        typeArguments: [payload.payload.transaction.coinType],
        functionArguments: [
          payload.payload.transaction.recipient,
          payload.payload.transaction.amount
        ]
      }
    });

    // 2. Facilitator가 Fee Payer로 서명 후 제출
    const signedTx = await this.aptos.transaction.signAsFeePayer({
      signer: this.facilitatorAccount,
      transaction
    });

    const result = await this.aptos.transaction.submit.simple({
      transaction,
      senderAuthenticator: payload.senderSignature,
      feePayerAuthenticator: signedTx
    });

    return {
      success: true,
      txHash: result.hash,
      network: "movement-testnet"
    };
  }
}
```

### 5.2 Facilitator 지갑 관리

```typescript
// 환경 변수
FACILITATOR_PRIVATE_KEY=0x...      # Facilitator 지갑 개인키
FACILITATOR_MIN_BALANCE=0.1        # 최소 MOVE 잔액 (가스비용)
```

---

## 6. 정산 시스템

### 6.1 정산 흐름

```
1. 결제 완료 (Payment SETTLED)
2. 정산 대기열 추가 (Settlement PENDING)
3. 배치 처리 (매일 00:00 또는 수동 요청)
4. 수수료 계산 (예: 2.5%)
5. Store Owner에게 순수익 전송
6. 정산 완료
```

### 6.2 정산 스케줄러

```typescript
@Injectable()
export class SettlementProcessor {
  @Cron('0 0 * * *')  // 매일 자정
  async processSettlements() {
    const pendingSettlements = await this.findPending();

    for (const settlement of pendingSettlements) {
      await this.processOne(settlement);
    }
  }

  async processOne(settlement: Settlement) {
    // 1. 플랫폼 수수료 계산
    const fee = settlement.amount * 0.025;
    const netAmount = settlement.amount - fee;

    // 2. Store Owner에게 전송
    const tx = await this.usdcService.transfer(
      settlement.store.owner,
      netAmount
    );

    // 3. 상태 업데이트
    await this.update(settlement.id, {
      status: 'COMPLETED',
      txHash: tx.hash,
      settledAt: new Date()
    });
  }
}
```

---

## 7. 환불 시스템

### 7.1 환불 흐름

```
1. Store Owner: 환불 요청 생성
2. 환불 검증 (원 결제 확인)
3. 환불 승인/거부
4. 승인 시: USDC 반환 트랜잭션 실행
5. 환불 완료
```

### 7.2 환불 조건

- 원 결제가 SETTLED 상태
- 정산 전인 경우만 전액 환불 가능
- 정산 후에는 Store Owner 잔액에서 차감

---

## 8. Move 기반 결제 처리

### 8.1 Movement Network 코인 전송

Movement Network는 Aptos Move VM 기반으로, 별도 커스텀 컨트랙트 없이
기본 `coin::transfer` 모듈을 활용합니다.

```typescript
// 결제 트랜잭션 (Aptos SDK)
const paymentTransaction = {
  function: "0x1::coin::transfer",
  typeArguments: ["0x...::usdc::USDC"],  // Stablecoin type
  functionArguments: [
    recipientAddress,  // Store owner (64 hex chars)
    amount             // USDC amount
  ]
};

// 정산 - 수수료 차감 후 전송
const settlementTransaction = {
  function: "0x1::coin::transfer",
  typeArguments: ["0x...::usdc::USDC"],
  functionArguments: [
    storeOwnerAddress,
    netAmount  // amount - platformFee
  ]
};

// 환불 트랜잭션
const refundTransaction = {
  function: "0x1::coin::transfer",
  typeArguments: ["0x...::usdc::USDC"],
  functionArguments: [
    customerAddress,
    refundAmount
  ]
};
```

### 8.2 Fee Payer 트랜잭션 패턴

```typescript
// Facilitator가 가스비를 대납하는 패턴
const transaction = await aptos.transaction.build.simple({
  sender: payerAddress,
  withFeePayer: true,  // Fee Payer 트랜잭션 활성화
  data: paymentTransaction
});

// Facilitator 서명 추가
await aptos.transaction.signAsFeePayer({
  signer: facilitatorAccount,
  transaction
});
```

---

## 9. 프론트엔드 변경사항

### 9.1 API 엔드포인트 변경

```typescript
// 기존
const API_URL = '/api';

// 변경
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
```

### 9.2 x402 결제 훅

```typescript
// hooks/useX402Payment.ts
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

export function useX402Payment() {
  const { signTransaction } = useWallet();  // Privy wallet hook

  const createPaymentPayload = async (requirements: PaymentRequirements) => {
    // 1. Move 트랜잭션 데이터 구성
    const transactionData = {
      sender: requirements.payerAddress,
      recipient: requirements.payTo,
      amount: requirements.maxAmountRequired,
      coinType: requirements.extra.coinType
    };

    // 2. Fee Payer 트랜잭션을 위한 서명 요청
    // (실제 서명은 Facilitator의 서명과 함께 백엔드에서 처리)
    const payload = {
      x402Version: 1,
      scheme: 'exact',
      network: 'movement-testnet',
      payload: {
        transaction: transactionData,
        feePayer: requirements.facilitator,
        expiresAt: requirements.expiresAt
      }
    };

    // 3. Base64 인코딩
    return btoa(JSON.stringify(payload));
  };

  // Fee Payer 트랜잭션 서명
  const signFeePayerTransaction = async (rawTransaction: string) => {
    return await signTransaction(rawTransaction);
  };

  return { createPaymentPayload, signFeePayerTransaction };
}
```

---

## 10. 구현 순서

### Phase 1: 기반 구축 (1-2일)
1. Monorepo 구조 설정 (frontend/backend 분리)
2. NestJS 프로젝트 초기화
3. Prisma 스키마 마이그레이션
4. 기본 모듈 구조 생성

### Phase 2: 인증 & 기본 API (1일)
1. Privy 인증 Guard 구현
2. Stores, Tabs 모듈 마이그레이션
3. 기존 API와 동일한 동작 확인

### Phase 3: x402 결제 시스템 (2-3일)
1. Facilitator 모듈 구현
2. Payment 모듈 구현
3. Move Fee Payer 트랜잭션 구현
4. coin::transfer 기반 가스비 대납 실행
5. 프론트엔드 x402 훅 구현

### Phase 4: 정산 시스템 (1일)
1. Settlement 모듈 구현
2. 배치 처리 스케줄러
3. 수수료 계산 로직
4. 정산 API & 관리 UI

### Phase 5: 환불 시스템 (1일)
1. Refund 모듈 구현
2. 환불 요청/승인 프로세스
3. 환불 트랜잭션 실행
4. 환불 API & 관리 UI

### Phase 6: 테스트 & 배포 (1-2일)
1. 단위 테스트 작성
2. E2E 테스트
3. Docker 설정
4. 배포 스크립트

---

## 11. 환경 변수

```bash
# Backend (.env)
DATABASE_URL="postgresql://root:1234@localhost:5432/xstore"

# Blockchain (Movement Network - Move VM)
MOVEMENT_NODE_URL="https://aptos.testnet.bardock.movementlabs.xyz/v1"
MOVEMENT_FAUCET_URL="https://faucet.testnet.bardock.movementlabs.xyz"
STABLECOIN_COIN_TYPE="0x...::usdc::USDC"

# Facilitator
FACILITATOR_PRIVATE_KEY="0x..."
FACILITATOR_ADDRESS="0x..."

# Platform
PLATFORM_FEE_RATE=250  # 2.5%
TREASURY_ADDRESS="0x..."

# Frontend
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

---

## 12. 리스크 및 고려사항

### 12.1 Movement Network USDC
- Movement Testnet에 공식 USDC가 없을 수 있음
- 대안: Move 기반 테스트 스테이블코인 사용 (coin::transfer 지원)

### 12.2 Facilitator 보안
- 개인키 관리 (HSM, Vault 권장)
- 가스비 잔액 모니터링
- Rate limiting

### 12.3 정산 실패 처리
- 재시도 로직
- 수동 개입 알림
- 롤백 메커니즘
