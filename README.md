# XStore

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?style=for-the-badge&logo=nestjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)
![Movement](https://img.shields.io/badge/Movement-Chain-purple?style=for-the-badge)

**A modern crypto-powered store management and ordering platform built on Movement blockchain**

[Features](#features) • [Architecture](#architecture) • [Getting Started](#getting-started) • [Documentation](#documentation)

</div>

---

## Overview

XStore is a full-stack Web3 application that enables merchants to create crypto-enabled stores where customers can browse menus, place orders, and pay using MOVE/USDC tokens on the Movement blockchain. The platform features a modern glass-morphism UI, QR code ordering system, and implements the x402 payment protocol for seamless cryptocurrency transactions with gas-sponsored transactions via the Facilitator service.

## Features

### For Store Owners
- **Easy Store Creation** - Create your crypto store in seconds with custom menu items
- **Table Management** - Add tables with QR codes for dine-in ordering
- **Menu Management** - Add, edit, and organize menu items by category
- **Tab System** - Track customer orders with real-time tab management
- **Reservation System** - Accept reservations with crypto deposit
- **Settlement System** - Batch payouts for completed payments

### For Customers
- **QR Code Ordering** - Scan table QR codes to browse and order
- **Tab-based Ordering** - Add items to your tab, pay when ready
- **Crypto Payments** - Pay with MOVE/USDC tokens on Movement chain
- **Social Login** - Login with email, wallet, or Google via Privy
- **AI Chat** - AI-powered assistance for ordering

### Technical Features
- **x402 Payment Protocol** - HTTP 402 Payment Required flow for crypto payments
- **Gas Sponsorship** - Facilitator service sponsors transaction fees
- **Real-time Updates** - React Query for optimistic updates and caching
- **Responsive Design** - Mobile-first glass-morphism UI
- **Type Safety** - Full TypeScript coverage

---

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      FRONTEND (Next.js 14)                          │
│                         Port: 3000                                  │
├─────────────────────────────────────────────────────────────────────┤
│  App Router Pages   │  Components       │  Hooks                    │
│  ├── /stores        │  ├── ui/          │  ├── useWallet           │
│  ├── /store/[id]    │  ├── layout/      │  ├── useStore(s)         │
│  ├── /manage        │  └── make-store   │  ├── useTabs             │
│  ├── /tab/[id]      │                   │  ├── useReservations     │
│  └── /chat          │                   │  └── useMenuItems        │
├─────────────────────────────────────────────────────────────────────┤
│                       BACKEND (NestJS 10)                           │
│                         Port: 3001                                  │
├─────────────────────────────────────────────────────────────────────┤
│  Modules:                                                           │
│  stores • tabs • payments • facilitator • settlements • refunds     │
│  x402 • auth • faucet • ai-chat                                     │
├─────────────────────────────────────────────────────────────────────┤
│                    Prisma ORM + PostgreSQL                          │
├─────────────────────────────────────────────────────────────────────┤
│                Movement Blockchain (MOVE/USDC)                      │
│                    Privy Authentication                             │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Model

```
Store (1) ─────┬───── (*) Order
              ├───── (*) MenuItem ──── (*) TabItem
              ├───── (*) Table ─────── (*) Tab ──────┬── (*) TabItem
              ├───── (*) Reservation ────────────────┤   └── (*) Payment ── (*) Refund
              └───── (*) Settlement ─────────────────┘
```

### Payment Flow (x402 Protocol)

```
┌──────────┐         ┌──────────┐         ┌───────────┐        ┌──────────┐
│  Client  │         │ Backend  │         │Facilitator│        │Blockchain│
└────┬─────┘         └────┬─────┘         └─────┬─────┘        └────┬─────┘
     │                    │                     │                   │
     │  POST /close       │                     │                   │
     │───────────────────>│                     │                   │
     │                    │                     │                   │
     │  402 Payment       │                     │                   │
     │  Required          │                     │                   │
     │<───────────────────│                     │                   │
     │                    │                     │                   │
     │  Sign Transaction  │                     │                   │
     │────────────────────────────────────────>│                   │
     │                    │                     │                   │
     │                    │   Fee Payer Signs   │                   │
     │                    │                     │──────────────────>│
     │                    │                     │                   │
     │  TX Hash           │                     │                   │
     │<────────────────────────────────────────────────────────────│
     │                    │                     │                   │
     │  POST /close       │                     │                   │
     │  + x-payment header│                     │                   │
     │───────────────────>│                     │                   │
     │                    │                     │                   │
     │  200 OK            │                     │                   │
     │<───────────────────│                     │                   │
```

---

## Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | Next.js 14 (App Router), React 18 |
| **Backend** | NestJS 10, Swagger API Docs |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS 3.4, Glass Morphism |
| **State Management** | React Query (TanStack Query) |
| **Database** | PostgreSQL 16, Prisma ORM |
| **Authentication** | Privy (Social + Wallet) |
| **Blockchain** | Movement Network (Aptos-compatible) |
| **Smart Contracts** | Move Language |
| **Wallet Integration** | @aptos-labs/ts-sdk, Privy Wallets |
| **Forms** | React Hook Form, Zod |
| **UI Components** | Radix UI, Lucide Icons |
| **AI** | Google Generative AI |

---

## Project Structure

```
xstore/
├── frontend/                         # Next.js Frontend (Port 3000)
│   ├── app/                          # App Router pages
│   │   ├── charge/                   # Top-up/charging page
│   │   ├── chat/                     # AI Chat integration
│   │   ├── make-store/               # Store creation wizard
│   │   ├── manage/                   # Store owner dashboard
│   │   ├── my-tabs/                  # Customer's active tabs
│   │   ├── order/                    # Order history
│   │   ├── reservations/             # Reservation management
│   │   ├── store/[id]/               # Store detail page
│   │   ├── stores/                   # Store listing
│   │   └── tab/[id]/                 # Tab view & payment
│   ├── components/
│   │   ├── ui/                       # Reusable UI components
│   │   └── layout/                   # Layout wrappers
│   ├── hooks/                        # Custom React hooks
│   ├── lib/                          # Utilities and helpers
│   ├── types/                        # TypeScript types
│   └── context/                      # React context (Privy)
│
├── backend/                          # NestJS Backend (Port 3001)
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/                 # Privy authentication
│   │   │   ├── stores/               # Store CRUD operations
│   │   │   ├── tabs/                 # Tab management
│   │   │   ├── payments/             # x402 payment processing
│   │   │   ├── facilitator/          # Gas fee sponsorship
│   │   │   ├── settlements/          # Batch payouts
│   │   │   ├── refunds/              # Refund workflow
│   │   │   ├── x402/                 # x402 protocol
│   │   │   ├── faucet/               # Test token faucet
│   │   │   └── ai-chat/              # AI chat module
│   │   └── common/                   # Shared utilities
│   └── prisma/
│       └── schema.prisma             # Database schema
│
├── move-contracts/                   # Movement Smart Contracts
│   ├── sources/
│   │   └── payment.move              # Payment module
│   └── tusdc/                        # Test USDC token
│
├── docker-compose.yml                # PostgreSQL container
└── package.json                      # Root workspace config
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm (uses npm workspaces)
- Docker & Docker Compose
- Privy App ID ([console.privy.io](https://console.privy.io))

### Installation

1. **Clone the repository**
```bash
git clone <repo-url>
cd xstore
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
# Copy environment files
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

Update environment variables:
```env
# backend/.env
DATABASE_URL="postgresql://root:1234@localhost:5432/xstore"
MOVEMENT_NODE_URL="https://aptos.testnet.porto.movementlabs.xyz/v1"
FACILITATOR_PRIVATE_KEY="your-facilitator-private-key"

# frontend/.env
NEXT_PUBLIC_PRIVY_APP_ID="your-privy-app-id"
```

4. **Start the database**
```bash
npm run docker:up
```

5. **Initialize database schema**
```bash
npm run db:push
```

6. **Start development servers**
```bash
npm run dev
```

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend: [http://localhost:3001](http://localhost:3001)
- API Docs: [http://localhost:3001/api](http://localhost:3001/api)

---

## Scripts

### Root Commands

| Script | Description |
|--------|-------------|
| `npm run dev` | Start frontend + backend concurrently |
| `npm run dev:frontend` | Start frontend only (port 3000) |
| `npm run dev:backend` | Start backend only (port 3001) |
| `npm run build` | Build all workspaces |
| `npm run lint` | Run ESLint on all workspaces |

### Database

| Script | Description |
|--------|-------------|
| `npm run docker:up` | Start PostgreSQL container |
| `npm run docker:down` | Stop PostgreSQL container |
| `npm run db:push` | Push schema to database |
| `npm run db:migrate` | Run database migrations |
| `npm run db:studio` | Open Prisma Studio GUI |
| `npm run db:generate` | Generate Prisma client |

### Move Contracts

| Script | Description |
|--------|-------------|
| `npm run move:compile` | Compile Move contracts |
| `npm run move:test` | Run Move contract tests |
| `npm run move:deploy` | Deploy to Movement testnet |

### Backend Testing

```bash
cd backend
npm run test           # Run Jest tests
npm run test:watch     # Watch mode
npm run test:cov       # Coverage report
npm run test:e2e       # End-to-end tests
npm run format         # Prettier format
```

---

## Documentation

### Core Concepts

#### Tab System
The tab system allows customers to accumulate orders before paying:
1. Customer opens a tab at a table
2. Add items to tab throughout visit
3. When ready, close tab and pay with MOVE/USDC
4. Tab uses x402 protocol for payment
5. Status flow: `OPEN → PENDING_PAYMENT → PAID`

#### x402 Payment Protocol
XStore implements the HTTP 402 Payment Required status:
1. Client requests to close tab (no payment header)
2. Server returns 402 with payment details
3. Client signs transaction, Facilitator sponsors gas
4. Transaction submitted to blockchain
5. Client retries with `x-payment` header containing TX hash
6. Server verifies and closes tab

#### Settlement System
Batch payouts to store owners:
1. Payments accumulate from completed tabs
2. Settlement created for pending payments
3. Batch transfer to store wallet
4. Status flow: `PENDING → PROCESSING → COMPLETED`

### API Reference

Backend provides Swagger documentation at `/api` endpoint.

#### Stores
- `GET /stores` - List all stores
- `POST /stores` - Create store
- `GET /stores/:id` - Get store details

#### Tabs
- `GET /tabs` - List tabs (filter by storeId, customer, status)
- `POST /tabs` - Create new tab
- `POST /tabs/:id/items` - Add item to tab
- `POST /tabs/:id/close` - Close tab (x402)

#### Payments
- `POST /payments/process` - Process x402 payment
- `GET /payments/:id` - Get payment status

---

## Design System

### Color Palette
- **Primary**: Violet (`#7c3aed`)
- **Secondary**: Fuchsia (`#c026d3`)
- **Background**: Slate 950 (`#020617`)
- **Glass**: White/5% opacity with blur

### UI Components
- **Glass Morphism**: Semi-transparent cards with backdrop blur
- **Gradients**: Violet to Fuchsia accent gradients
- **Animations**: Fade-in, slide-up micro-interactions
- **Status Colors**: Emerald (success), Yellow (pending), Red (error), Blue (info)

---

## Deployment

### Frontend (Vercel)

1. Connect GitHub repository to Vercel
2. Set root directory to `frontend`
3. Add environment variables:
   - `NEXT_PUBLIC_PRIVY_APP_ID`
4. Deploy

### Backend (Docker)

```bash
cd backend
docker build -t xstore-backend .
docker run -p 3001:3001 xstore-backend
```

---

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with Movement blockchain**

</div>
