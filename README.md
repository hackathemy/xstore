# XStore

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)
![Movement](https://img.shields.io/badge/Movement-Chain-purple?style=for-the-badge)

**A modern crypto-powered store management and ordering platform built on Movement blockchain**

[Features](#features) • [Architecture](#architecture) • [Getting Started](#getting-started) • [Documentation](#documentation)

</div>

---

## Overview

XStore is a full-stack Web3 application that enables merchants to create crypto-enabled stores where customers can browse menus, place orders, and pay using MOVE tokens on the Movement blockchain. The platform features a modern glass-morphism UI, QR code ordering system, and implements the x402 payment protocol for seamless cryptocurrency transactions.

## Features

### For Store Owners
- **Easy Store Creation** - Create your crypto store in seconds with custom menu items
- **Table Management** - Add tables with QR codes for dine-in ordering
- **Menu Management** - Add, edit, and organize menu items by category
- **Tab System** - Track customer orders with real-time tab management
- **Reservation System** - Accept reservations with crypto deposit

### For Customers
- **QR Code Ordering** - Scan table QR codes to browse and order
- **Tab-based Ordering** - Add items to your tab, pay when ready
- **Crypto Payments** - Pay with MOVE tokens on Movement chain
- **Social Login** - Login with email, wallet, or Google via Privy

### Technical Features
- **x402 Payment Protocol** - HTTP 402 Payment Required flow for crypto payments
- **Real-time Updates** - React Query for optimistic updates and caching
- **Responsive Design** - Mobile-first glass-morphism UI
- **Type Safety** - Full TypeScript coverage

---

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Next.js)                        │
├─────────────────────────────────────────────────────────────────┤
│  Pages          │  Components       │  Hooks                    │
│  ├── /          │  ├── ui/          │  ├── useWallet           │
│  ├── /stores    │  ├── layout/      │  ├── useStore(s)         │
│  ├── /store/[id]│  └── make-store   │  ├── useTabs             │
│  ├── /manage    │                   │  ├── useReservations     │
│  └── /tab/[id]  │                   │  └── useMenuItems        │
├─────────────────────────────────────────────────────────────────┤
│                       API Routes (Next.js)                      │
│  /api/stores • /api/orders • /api/tabs • /api/reservations     │
├─────────────────────────────────────────────────────────────────┤
│                    Prisma ORM + PostgreSQL                      │
├─────────────────────────────────────────────────────────────────┤
│                    Movement Blockchain (MOVE)                   │
│                    Privy Authentication                         │
└─────────────────────────────────────────────────────────────────┘
```

### Data Model

```
Store (1) ─────┬───── (*) Order
              ├───── (*) MenuItem ──── (*) TabItem
              ├───── (*) Table ─────── (*) Tab ──────┬── (*) TabItem
              └───── (*) Reservation ────────────────┘
```

### Payment Flow (x402 Protocol)

```
┌──────────┐         ┌──────────┐         ┌──────────┐
│  Client  │         │   API    │         │Blockchain│
└────┬─────┘         └────┬─────┘         └────┬─────┘
     │                    │                    │
     │  POST /close       │                    │
     │───────────────────>│                    │
     │                    │                    │
     │  402 Payment       │                    │
     │  Required          │                    │
     │<───────────────────│                    │
     │                    │                    │
     │  Send MOVE         │                    │
     │────────────────────────────────────────>│
     │                    │                    │
     │  TX Hash           │                    │
     │<────────────────────────────────────────│
     │                    │                    │
     │  POST /close       │                    │
     │  + x-payment header│                    │
     │───────────────────>│                    │
     │                    │                    │
     │  200 OK            │                    │
     │<───────────────────│                    │
     │                    │                    │
```

---

## Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS 3.4, Glass Morphism |
| **State Management** | React Query (TanStack Query) |
| **Database** | PostgreSQL, Prisma ORM |
| **Authentication** | Privy (Social + Wallet) |
| **Blockchain** | Movement Chain (Chain ID: 30732) |
| **Wallet Integration** | Viem, Privy Wallets |
| **Forms** | React Hook Form, Zod |
| **UI Components** | Radix UI, Lucide Icons |

---

## Project Structure

```
xstore/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── stores/               # Store CRUD
│   │   ├── orders/               # Order management
│   │   ├── tabs/                 # Tab system (x402)
│   │   │   └── [id]/close/       # Payment endpoint
│   │   ├── tables/               # Table management
│   │   ├── menu-items/           # Menu CRUD
│   │   └── reservations/         # Reservation system
│   ├── store/[id]/               # Public store pages
│   │   ├── page.tsx              # Store detail & ordering
│   │   ├── reserve/              # Reservation page
│   │   └── table/[tableId]/      # QR table ordering
│   ├── tab/[id]/                 # Tab view & payment
│   ├── manage/                   # Store owner dashboard
│   ├── make-store/               # Store creation
│   ├── stores/                   # Store listing
│   ├── my-tabs/                  # Customer tabs
│   ├── reservations/             # Customer reservations
│   ├── order/                    # Order history
│   └── page.tsx                  # Home page
├── components/
│   ├── ui/                       # Reusable UI components
│   │   ├── button.tsx            # Button variants
│   │   ├── input.tsx             # Form inputs
│   │   ├── select.tsx            # Dropdown select
│   │   ├── badge.tsx             # Status badges
│   │   ├── empty-state.tsx       # Empty state displays
│   │   ├── loading-skeleton.tsx  # Loading states
│   │   └── status-badge.tsx      # Tab/Reservation status
│   ├── layout/                   # Layout components
│   │   ├── page-layout.tsx       # Page wrapper
│   │   └── header.tsx            # App header
│   ├── login-button.tsx          # Privy login
│   └── make-store.tsx            # Store form
├── hooks/                        # Custom React hooks
│   ├── useWallet.ts              # Wallet operations
│   ├── useStore.ts               # Single store
│   ├── useStores.ts              # Store listing
│   ├── useMyStore.ts             # Owner's store
│   ├── useTabs.ts                # Tabs listing
│   ├── useTab.ts                 # Single tab
│   ├── useTables.ts              # Tables
│   ├── useMenuItems.ts           # Menu items
│   ├── useReservations.ts        # Reservations
│   ├── useOrders.ts              # Orders
│   └── useQuery.ts               # Query factory
├── lib/                          # Utilities
│   ├── prisma.ts                 # Prisma client
│   ├── chains.ts                 # Movement chain config
│   ├── constants.ts              # App constants
│   └── utils.ts                  # Helper functions
├── types/                        # TypeScript types
│   ├── store.ts                  # Store types
│   ├── tab.ts                    # Tab types
│   ├── order.ts                  # Order types
│   └── reservation.ts            # Reservation types
├── context/                      # React context
│   └── index.tsx                 # Privy provider
├── prisma/
│   └── schema.prisma             # Database schema
└── public/                       # Static assets
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
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
pnpm install
```

3. **Configure environment**
```bash
cp .env.example .env
```

Update `.env` with your credentials:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/xstore"
NEXT_PUBLIC_PRIVY_APP_ID="your-privy-app-id"
```

4. **Start the database**
```bash
pnpm docker:up
```

5. **Initialize database schema**
```bash
pnpm db:push
```

6. **Start development server**
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm docker:up` | Start PostgreSQL container |
| `pnpm docker:down` | Stop PostgreSQL container |
| `pnpm db:push` | Push schema to database |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm db:generate` | Generate Prisma client |

---

## Documentation

### Core Concepts

#### Tab System
The tab system allows customers to accumulate orders before paying:
1. Customer opens a tab at a table
2. Add items to tab throughout visit
3. When ready, close tab and pay with MOVE
4. Tab uses x402 protocol for payment

#### x402 Payment Protocol
XStore implements the HTTP 402 Payment Required status:
1. Client requests to close tab (no payment header)
2. Server returns 402 with payment details
3. Client sends MOVE to store owner
4. Client retries with `x-payment` header containing TX hash
5. Server verifies and closes tab

#### Reservation System
Reservations require a small deposit (0.001 MOVE):
1. Customer fills reservation form
2. API returns 402 Payment Required
3. Customer pays deposit to store owner
4. Reservation confirmed upon payment

### API Reference

#### Stores
- `GET /api/stores` - List all stores
- `POST /api/stores` - Create store
- `GET /api/stores/[id]` - Get store details
- `PUT /api/stores/[id]` - Update store
- `DELETE /api/stores/[id]` - Delete store

#### Tabs
- `GET /api/tabs` - List tabs (filter by storeId, customer, status)
- `POST /api/tabs` - Create new tab
- `GET /api/tabs/[id]` - Get tab details
- `POST /api/tabs/[id]/items` - Add item to tab
- `POST /api/tabs/[id]/close` - Close tab (x402)

#### Reservations
- `GET /api/reservations` - List reservations
- `POST /api/reservations` - Create reservation (x402)
- `PUT /api/reservations/[id]` - Update status

#### Tables
- `GET /api/tables` - List tables
- `POST /api/tables` - Create table
- `DELETE /api/tables/[id]` - Delete table

#### Menu Items
- `GET /api/menu-items` - List menu items
- `POST /api/menu-items` - Create menu item

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

### Vercel (Recommended)

1. Connect GitHub repository to Vercel
2. Add environment variables:
   - `DATABASE_URL`
   - `NEXT_PUBLIC_PRIVY_APP_ID`
3. Deploy

### Docker

```bash
docker build -t xstore .
docker run -p 3000:3000 xstore
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
