# XStore

<div align="center">

![Movement](https://img.shields.io/badge/Movement-Chain-purple?style=for-the-badge)
![x402](https://img.shields.io/badge/x402-Protocol-blue?style=for-the-badge)
![Privy](https://img.shields.io/badge/Privy-Embedded_Wallets-green?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?style=for-the-badge&logo=nestjs)

### **Cardless Crypto Payments for Real-World Commerce**

*A Web3 restaurant ordering platform with gasless payments, QR table ordering, and seamless onboarding*

[Live Demo](https://xstore.vercel.app) | [API Docs](https://xstore-api.vercel.app/api)

</div>

---

## Hackathon Tracks

XStore is built for **three Movement hackathon bounty tracks**:

| Track | Focus | Key Innovation |
|-------|-------|----------------|
| **Best Consumer App** | Mobile-first restaurant ordering | Social login + gasless payments |
| **Best x402 App** | HTTP 402 Payment Protocol | Fee payer gas sponsorship |
| **Best Privy Wallets App** | Embedded wallet UX | Privy signature → Movement wallet derivation |

---

## Problem & Solution

### The Problem
Traditional crypto payments create friction:
- Users need to buy gas tokens before transacting
- Complex wallet setup scares away mainstream users
- No real-world utility beyond speculation

### Our Solution
XStore removes all friction for restaurant payments:
- **Social Login**: Email, Google, or wallet - your choice
- **Gasless Payments**: Platform sponsors all transaction fees
- **Instant Onboarding**: No gas tokens needed to start
- **Real Utility**: Order food, pay with stablecoins, get receipts

---

## Key Features

### For Customers
- **QR Code Ordering** - Scan table QR to browse menu and order
- **Tab System** - Accumulate orders, pay when ready (like a real restaurant tab)
- **Gasless Payments** - Pay only USDC, we cover gas fees
- **Social Login** - Email/Google via Privy, no seed phrases
- **AI Chat** - Get menu recommendations from AI assistant

### For Store Owners
- **Easy Setup** - Create store in 30 seconds
- **Table Management** - Generate QR codes for each table
- **Real-time Tabs** - Monitor open orders across tables
- **Auto Settlement** - Receive batch payouts automatically
- **Reservation System** - Accept crypto deposits for bookings

---

## Technical Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 14)                            │
│                           Port: 3000                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  Privy Auth          │  React Query        │  Glass-morphism UI        │
│  ├── Social Login    │  ├── Server State   │  ├── Mobile-first         │
│  ├── Embedded Wallet │  ├── Optimistic UI  │  ├── Staggered Animations │
│  └── Movement Derive │  └── Cache          │  └── Responsive Grid      │
├─────────────────────────────────────────────────────────────────────────┤
│                        BACKEND (NestJS 10)                              │
│                           Port: 3001                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  x402 Protocol       │  Facilitator        │  Business Logic           │
│  ├── 402 Response    │  ├── Gas Sponsor    │  ├── Stores/Tabs          │
│  ├── Payment Verify  │  ├── Fee Payer TX   │  ├── Settlements          │
│  └── Receipt Gen     │  └── Registration   │  └── Refunds              │
├─────────────────────────────────────────────────────────────────────────┤
│                    Prisma ORM + PostgreSQL                              │
├─────────────────────────────────────────────────────────────────────────┤
│                  Movement Blockchain (Testnet)                          │
│                    MOVE / USDC Stablecoin                               │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Model

```
Store ─────┬───── MenuItem ──── TabItem
           ├───── Table ─────── Tab ──────┬── TabItem
           ├───── Reservation ────────────┤
           └───── Settlement ─────────────┴── Payment ── Refund
```

---

## Track 1: Best Consumer App

### User Onboarding Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Landing    │────▶│  Privy Login │────▶│ Auto Wallet  │────▶│  Start Order │
│    Page      │     │ Email/Google │     │   Created    │     │   (Gasless)  │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                           │                     │
                           ▼                     ▼
                     No seed phrase       Movement wallet
                     No gas purchase      derived from Privy
```

### Mobile-First Design
- **Glass-morphism UI**: Semi-transparent cards with backdrop blur
- **Responsive Grid**: 1-col mobile → 3-col desktop
- **Staggered Animations**: Fade-in-up with delays
- **Status Colors**: Emerald/Yellow/Red for clear feedback

### Revenue Model
1. **Transaction Fees**: 1-2% per payment (architecture ready)
2. **Reservation Deposits**: 0.001 MOVE per booking
3. **Premium Features**: Analytics, custom branding
4. **Gas Sponsorship**: Platform bears cost for user acquisition

### Demo Flow
1. Visit store listing → Browse stores
2. Select store → View menu
3. Add to tab → Adjust quantity & tip
4. Close tab → Gasless USDC payment
5. Receive on-chain receipt

---

## Track 2: Best x402 App

### x402 Payment Protocol Implementation

XStore implements the full HTTP 402 Payment Required protocol with **gas sponsorship innovation**:

```
┌──────────┐         ┌──────────┐         ┌───────────┐        ┌──────────┐
│  Client  │         │ Backend  │         │Facilitator│        │Blockchain│
└────┬─────┘         └────┬─────┘         └─────┬─────┘        └────┬─────┘
     │                    │                     │                   │
     │  1. POST /close    │                     │                   │
     │───────────────────▶│                     │                   │
     │                    │                     │                   │
     │  2. HTTP 402       │                     │                   │
     │  X-Payment-Required│                     │                   │
     │◀───────────────────│                     │                   │
     │                    │                     │                   │
     │  3. Build Sponsored TX                   │                   │
     │─────────────────────────────────────────▶│                   │
     │                    │                     │                   │
     │  4. TX Bytes       │                     │                   │
     │◀─────────────────────────────────────────│                   │
     │                    │                     │                   │
     │  5. Sign as Sender │                     │                   │
     │  (Local Ed25519)   │                     │                   │
     │                    │                     │                   │
     │  6. Submit Signed  │                     │                   │
     │─────────────────────────────────────────▶│                   │
     │                    │                     │                   │
     │                    │  7. Co-sign as Fee Payer               │
     │                    │                     │──────────────────▶│
     │                    │                     │                   │
     │  8. TX Hash + Receipt                    │                   │
     │◀────────────────────────────────────────────────────────────│
```

### Novel x402 Uses (Beyond Simple Paywalls)

| Innovation | Description |
|------------|-------------|
| **Gas Sponsorship Layer** | x402 headers coordinate fee payer transactions |
| **POS Tab Integration** | Restaurant tabs accumulate → single x402 payment |
| **Coin Registration Sponsor** | New users register for USDC without gas |
| **Auto Settlement Triggers** | 30-second delay + daily cron for batch payouts |
| **Refund Protocol** | Integrated refund workflow with x402 receipts |

### x402 Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/x402/request` | POST | Get payment requirements (402 response) |
| `/x402/build-sponsored` | POST | Build fee payer transaction |
| `/x402/submit-sponsored` | POST | Submit with gas sponsorship |
| `/x402/verify` | POST | Verify on-chain payment |
| `/x402/info` | GET | Protocol capabilities |

### Revenue Path
- **Direct Transfer Model**: Funds → Store wallet (non-custodial)
- **Fee Extraction Ready**: PaymentsService architecture supports % deduction
- **Settlement Batching**: Could accumulate for cheaper batch transfers

---

## Track 3: Best Privy Wallets App

### Privy Embedded Wallet Integration

XStore uses Privy embedded wallets for **cryptographic wallet derivation**, not just authentication:

```typescript
// 1. User logs in with Privy (email/Google)
const { login, user } = usePrivy();
const { wallets } = useWallets();

// 2. Get embedded wallet and request signature
const embeddedWallet = wallets.find(w => w.walletClientType === 'privy');
const signature = await provider.request({
  method: 'personal_sign',
  params: [DERIVATION_MESSAGE, embeddedWallet.address],
});

// 3. Derive Movement wallet from signature
const seed = sha256(signature);
const privateKey = new Ed25519PrivateKey(seed);
const movementAccount = Account.fromPrivateKey({ privateKey });

// Result: Same Privy user → Same Movement address (deterministic)
```

### Key Management Abstraction

| Layer | Complexity Hidden |
|-------|-------------------|
| **PrivyWalletContext** | Wallet derivation, persistence, balance queries |
| **useWallet Hook** | Test vs production switching |
| **usePayment Hook** | x402 payment orchestration |
| **UI Components** | Just show "Pay" button |

### What Users Experience
1. Click "Login with Google"
2. See wallet address (auto-created)
3. Click "Pay Tab"
4. Done (no gas, no signing prompts)

### What's Actually Happening
1. Privy creates embedded wallet
2. App derives Movement Ed25519 key from Privy signature
3. Transaction built with Facilitator as fee payer
4. User's key signs locally
5. Facilitator co-signs and submits
6. User pays only USDC, gas covered

### Technical Correctness
- **EIP-191 Personal Sign**: Standard signature request
- **SHA256 Derivation**: Cryptographically secure seed generation
- **Ed25519 Keys**: Movement-native key format
- **LocalStorage Persistence**: Wallet survives sessions
- **Deterministic**: Same user always gets same address

---

## Smart Contracts (Move)

### Payment Module

```move
module xstore::payment {
    // Generic payment function - works with MOVE, USDC, USDT
    public entry fun pay<CoinType>(
        payer: &signer,
        store_address: address,
        amount: u64,
        payment_id: vector<u8>
    ) {
        // Transfer coins
        coin::transfer<CoinType>(payer, store_address, amount);

        // Record payment on-chain
        let record = PaymentRecord {
            payment_id,
            payer: signer::address_of(payer),
            store: store_address,
            amount,
            timestamp: timestamp::now_seconds(),
        };

        // Emit event
        event::emit(PaymentEvent { ... });
    }

    // Refund function
    public entry fun refund<CoinType>(...) { ... }

    // Store registration
    public entry fun register_store(...) { ... }
}
```

### Supported Tokens

| Network | Token | Address |
|---------|-------|---------|
| Testnet | TUSDC | `0x60a2f...::tusdc::TUSDC` |
| Testnet | TUSDT | `0x60a2f...::tusdt::TUSDT` |
| Mainnet | USDC | `0xbae20...::usdc::USDC` (LayerZero) |
| Mainnet | USDT | `0xbae20...::usdt::USDT` (LayerZero) |

---

## Getting Started

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Privy App ID ([console.privy.io](https://console.privy.io))

### Quick Start

```bash
# 1. Clone and install
git clone <repo-url>
cd xstore
npm install

# 2. Configure environment
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env

# 3. Start database
npm run docker:up

# 4. Initialize schema
npm run db:push

# 5. Start development
npm run dev
```

### Environment Variables

```env
# backend/.env
DATABASE_URL="postgresql://root:1234@localhost:5432/xstore"
MOVEMENT_NODE_URL="https://aptos.testnet.bardock.movementlabs.xyz/v1"
FACILITATOR_PRIVATE_KEY="your-ed25519-private-key"

# frontend/.env
NEXT_PUBLIC_PRIVY_APP_ID="your-privy-app-id"
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

### URLs
- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- API Docs: http://localhost:3001/api

---

## Project Structure

```
xstore/
├── frontend/                    # Next.js 14 App
│   ├── app/                     # App Router pages
│   │   ├── stores/              # Store listing
│   │   ├── store/[id]/          # Store detail & order
│   │   ├── tab/[id]/            # Tab view & payment
│   │   ├── my-tabs/             # Customer's tabs
│   │   ├── manage/              # Store owner dashboard
│   │   ├── chat/                # AI assistant
│   │   └── charge/              # Faucet & registration
│   ├── components/              # React components
│   ├── context/                 # Privy & Wallet contexts
│   ├── hooks/                   # Custom hooks
│   └── lib/                     # API client, utilities
│
├── backend/                     # NestJS 10 API
│   ├── src/
│   │   ├── modules/
│   │   │   ├── x402/            # x402 protocol
│   │   │   ├── facilitator/     # Gas sponsorship
│   │   │   ├── payments/        # Payment processing
│   │   │   ├── stores/          # Store CRUD
│   │   │   ├── tabs/            # Tab management
│   │   │   ├── settlements/     # Batch payouts
│   │   │   └── refunds/         # Refund workflow
│   │   └── common/
│   │       └── x402/            # Protocol types & interceptors
│   └── prisma/
│       └── schema.prisma        # Database schema
│
└── move-contracts/              # Move smart contracts
    └── sources/
        └── payment.move         # Payment module
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend + backend |
| `npm run docker:up` | Start PostgreSQL |
| `npm run db:push` | Push Prisma schema |
| `npm run db:studio` | Open Prisma Studio |
| `npm run move:compile` | Compile Move contracts |
| `npm run move:deploy` | Deploy to testnet |

---

## API Reference

### Stores
- `GET /stores` - List all stores
- `POST /stores` - Create store
- `GET /stores/:id` - Get store details

### Tabs
- `POST /tabs` - Create new tab
- `GET /tabs` - List tabs (filter by store, customer, status)
- `POST /tabs/:id/items` - Add item to tab
- `POST /tabs/:id/close` - Close tab (triggers x402)

### x402 Protocol
- `POST /x402/request` - Initiate payment (returns 402)
- `POST /x402/build-sponsored` - Build fee payer TX
- `POST /x402/submit-sponsored` - Submit with sponsorship
- `GET /x402/sponsorship-status` - Check facilitator balance

### Payments
- `GET /payments/:id` - Get payment status
- `POST /payments/process` - Process x402 payment

---

## Demo Walkthrough

### Customer Flow
1. **Browse**: Visit `/stores` to see restaurants
2. **Select**: Click store to view menu
3. **Order**: Add items with quantity and tip
4. **Pay**: Click "Pay Tab" - gasless USDC transfer
5. **Receipt**: Get on-chain TX hash

### Store Owner Flow
1. **Create**: Visit `/make-store` to set up
2. **Tables**: Add tables with QR codes
3. **Monitor**: View open tabs in `/manage`
4. **Settle**: Auto-receive batch payouts

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, TailwindCSS |
| Backend | NestJS 10, Prisma, PostgreSQL |
| Auth | Privy (Social + Embedded Wallets) |
| Blockchain | Movement Network (Aptos-compatible) |
| Payments | x402 Protocol + Gas Sponsorship |
| AI | Google Generative AI |

---

## Security

- **Non-custodial**: Funds transfer directly to store wallets
- **Local Signing**: Private keys never leave browser
- **Deterministic Derivation**: Same user → same address
- **Fee Payer Pattern**: Users can't be drained for gas
- **5-minute Payment Window**: Prevents stale transaction attacks

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

**Built on Movement Network**

*Gasless payments for the real world*
