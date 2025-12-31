# XStore Payment Module - Movement Network

Move 언어로 작성된 XStore 결제 모듈입니다. Movement Network (Aptos-compatible)에서 실행됩니다.

## 구조

```
move-contracts/
├── Move.toml          # 프로젝트 설정
├── sources/
│   └── payment.move   # 결제 모듈
└── README.md
```

## 기능

### 스토어 관리
- `register_store`: 새 스토어 등록
- `update_store_wallet`: 스토어 지갑 주소 변경
- `deactivate_store`: 스토어 비활성화
- `reactivate_store`: 스토어 재활성화

### 결제 처리
- `pay`: 스토어에 결제 (payment_id로 추적)
- `transfer`: 단순 P2P 전송
- `refund`: 환불 처리

### 조회 함수
- `get_store_info`: 스토어 정보 조회
- `is_store_registered`: 스토어 등록 여부 확인
- `get_payment_count`: 결제 횟수 조회
- `get_total_received`: 총 수령액 조회

## 이벤트

- `PaymentEvent`: 결제 발생 시
- `RefundEvent`: 환불 발생 시
- `StoreRegisteredEvent`: 스토어 등록 시

## 설치 및 배포

### 1. Aptos CLI 설치

```bash
curl -fsSL "https://aptos.dev/scripts/install_cli.py" | python3
```

### 2. 계정 초기화

```bash
aptos init --network testnet
```

### 3. 컴파일

```bash
cd move-contracts
aptos move compile --named-addresses xstore=default
```

### 4. 테스트

```bash
aptos move test --named-addresses xstore=default
```

### 5. 배포 (Movement Testnet)

```bash
aptos move publish \
  --named-addresses xstore=default \
  --url https://aptos.testnet.bardock.movementlabs.xyz/v1 \
  --assume-yes
```

## 사용 예시

### 스토어 등록

```typescript
const payload = {
  function: `${MODULE_ADDRESS}::payment::register_store`,
  functionArguments: [
    "My Store",           // store name
    storeWalletAddress,   // wallet address
  ],
};
await signAndSubmitTransaction(payload);
```

### 결제

```typescript
const payload = {
  function: `${MODULE_ADDRESS}::payment::pay`,
  functionArguments: [
    "payment_12345",      // payment ID
    storeAddress,         // store address
    100000000,            // amount (1 MOVE = 10^8)
  ],
};
await signAndSubmitTransaction(payload);
```

### 단순 전송 (스토어 미등록)

현재 구현은 `0x1::aptos_account::transfer`를 사용하여
스토어 등록 없이도 결제가 가능합니다.

```typescript
const payload = {
  function: "0x1::aptos_account::transfer",
  functionArguments: [recipientAddress, amount],
};
```

## 네트워크 설정

| 네트워크 | Node URL | Chain ID |
|---------|----------|----------|
| Movement Testnet | https://aptos.testnet.bardock.movementlabs.xyz/v1 | 250 |
| Movement Mainnet | https://mainnet.movementnetwork.xyz/v1 | 126 |
| Local | http://127.0.0.1:8080/v1 | 4 |

## 환경 변수

```env
# Frontend
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_PAYMENT_MODULE_ADDRESS=0x...  # 배포 후 설정
NEXT_PUBLIC_TEST_PRIVATE_KEY=0x...        # 테스트용 개인키

# Backend
MOVEMENT_NODE_URL=https://aptos.testnet.bardock.movementlabs.xyz/v1
FACILITATOR_PRIVATE_KEY=0x...             # Facilitator 개인키
```
