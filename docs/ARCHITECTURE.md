# XStore Architecture

This document provides a detailed overview of the XStore application architecture, design decisions, and implementation patterns.

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Frontend Architecture](#frontend-architecture)
- [Backend Architecture](#backend-architecture)
- [Database Design](#database-design)
- [Authentication](#authentication)
- [Payment System](#payment-system)
- [State Management](#state-management)

---

## Overview

XStore is built as a monolithic Next.js application using the App Router architecture. This approach provides:

- **Unified Deployment**: Single deployment unit for frontend and backend
- **Type Safety**: Shared types between client and server
- **Performance**: Server-side rendering and static generation where appropriate
- **Developer Experience**: Hot reload, integrated API routes

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              USER LAYER                                 │
│   Store Owner (Dashboard)    │    Customer (Mobile/Desktop)             │
└──────────────────────────────┼──────────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────────┐
│                         PRESENTATION LAYER                              │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐            │
│  │  Pages (SSR)   │  │  Components    │  │  Layouts       │            │
│  │  /store/[id]   │  │  ui/           │  │  page-layout   │            │
│  │  /tab/[id]     │  │  layout/       │  │  header        │            │
│  │  /manage       │  │  forms         │  │                │            │
│  └────────────────┘  └────────────────┘  └────────────────┘            │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────────┐
│                          STATE LAYER                                    │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐            │
│  │  React Query   │  │  React Context │  │  Local State   │            │
│  │  (Server)      │  │  (Auth/Wallet) │  │  (UI State)    │            │
│  └────────────────┘  └────────────────┘  └────────────────┘            │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────────┐
│                          SERVICE LAYER                                  │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐            │
│  │  Custom Hooks  │  │  API Client    │  │  Wallet Ops    │            │
│  │  useStore      │  │  fetch()       │  │  useWallet     │            │
│  │  useTabs       │  │                │  │  sendMOVE      │            │
│  └────────────────┘  └────────────────┘  └────────────────┘            │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────────┐
│                           API LAYER                                     │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐            │
│  │  Route Handlers│  │  x402 Payment  │  │  Middleware    │            │
│  │  /api/stores   │  │  Protocol      │  │  Auth          │            │
│  │  /api/tabs     │  │                │  │                │            │
│  └────────────────┘  └────────────────┘  └────────────────┘            │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────────┐
│                          DATA LAYER                                     │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐            │
│  │  Prisma ORM    │  │  PostgreSQL    │  │  Movement      │            │
│  │                │  │                │  │  Blockchain    │            │
│  └────────────────┘  └────────────────┘  └────────────────┘            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Component Hierarchy

```
App Layout (layout.tsx)
├── PrivyProvider (context/index.tsx)
│   └── QueryClientProvider
│       └── Pages
│           ├── PageLayout (components/layout/page-layout.tsx)
│           │   ├── Header (components/layout/header.tsx)
│           │   └── Content
│           │       ├── UI Components (components/ui/)
│           │       └── Feature Components
```

### Component Categories

#### 1. UI Components (`/components/ui/`)
Atomic, reusable components following a design system:

| Component | Purpose |
|-----------|---------|
| `button.tsx` | Button with variants (default, outline, destructive) |
| `input.tsx` | Form input with consistent styling |
| `select.tsx` | Dropdown select (Radix UI based) |
| `badge.tsx` | Status/label badges |
| `empty-state.tsx` | Empty state displays with icons |
| `loading-skeleton.tsx` | Loading states (skeleton, spinner) |
| `status-badge.tsx` | Tab/Reservation status indicators |

#### 2. Layout Components (`/components/layout/`)
Structural components for consistent page layouts:

| Component | Purpose |
|-----------|---------|
| `page-layout.tsx` | Main page wrapper with gradient background |
| `header.tsx` | App header with navigation |

#### 3. Feature Components
Domain-specific components tied to business logic:

| Component | Purpose |
|-----------|---------|
| `make-store.tsx` | Store creation form |
| `login-button.tsx` | Privy authentication button |

### Styling Architecture

```
Global Styles (globals.css)
├── Tailwind Base
├── Custom Utilities
│   ├── .card-elevated (Glass morphism card)
│   ├── .gradient-text (Violet-Fuchsia gradient)
│   ├── .hover-lift (Hover animation)
│   └── .animate-fade-in-up (Entry animation)
└── Component Styles
```

**Design Tokens:**
```css
/* Background Gradient */
from-slate-950 via-purple-950 to-slate-950

/* Glass Effect */
bg-white/5 backdrop-blur-lg border-white/10

/* Primary Gradient */
from-violet-600 to-fuchsia-600

/* Status Colors */
--success: emerald-400
--warning: yellow-400
--error: red-400
--info: blue-400
```

---

## Backend Architecture

### API Route Structure

```
/api
├── /stores
│   ├── route.ts          # GET (list), POST (create)
│   └── /[id]
│       └── route.ts      # GET, PUT, DELETE
├── /tabs
│   ├── route.ts          # GET (list), POST (create)
│   └── /[id]
│       ├── route.ts      # GET, PUT
│       ├── /items
│       │   └── route.ts  # POST (add item)
│       └── /close
│           └── route.ts  # POST (x402 payment)
├── /tables
│   ├── route.ts          # GET, POST
│   └── /[id]
│       └── route.ts      # GET, DELETE
├── /menu-items
│   └── route.ts          # GET, POST
├── /reservations
│   ├── route.ts          # GET, POST (x402)
│   └── /[id]
│       └── route.ts      # PUT
└── /orders
    └── route.ts          # GET, POST
```

### Request/Response Flow

```
Client Request
     │
     ▼
┌────────────────┐
│   Middleware   │ ─── Authentication check
└───────┬────────┘
        │
        ▼
┌────────────────┐
│  Route Handler │ ─── Business logic
└───────┬────────┘
        │
        ▼
┌────────────────┐
│   Prisma ORM   │ ─── Database operations
└───────┬────────┘
        │
        ▼
┌────────────────┐
│   PostgreSQL   │
└────────────────┘
```

### API Response Patterns

**Success Response:**
```json
{
  "data": { ... },
  "message": "Operation successful"
}
```

**Error Response:**
```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

**x402 Payment Required:**
```json
{
  "error": "Payment Required",
  "payment": {
    "version": "1",
    "network": "movement-testnet",
    "amount": "0.001",
    "currency": "MOVE",
    "recipient": "0x..."
  }
}
```

---

## Database Design

### Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    Store    │       │   MenuItem  │       │   TabItem   │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id          │◄──────│ storeId     │       │ id          │
│ name        │       │ name        │◄──────│ menuItemId  │
│ description │       │ description │       │ tabId       │──────┐
│ price       │       │ price       │       │ name        │      │
│ menu        │       │ category    │       │ price       │      │
│ image       │       │ available   │       │ quantity    │      │
│ owner       │       └─────────────┘       └─────────────┘      │
└──────┬──────┘                                                   │
       │                                                          │
       │       ┌─────────────┐       ┌─────────────┐             │
       │       │    Table    │       │     Tab     │◄────────────┘
       │       ├─────────────┤       ├─────────────┤
       ├──────►│ storeId     │◄──────│ tableId     │
       │       │ number      │       │ storeId     │◄─────┐
       │       │ name        │       │ customer    │      │
       │       │ seats       │       │ status      │      │
       │       └─────────────┘       │ totalAmount │      │
       │                             │ paymentHash │      │
       │                             └──────┬──────┘      │
       │                                    │             │
       │       ┌─────────────┐              │             │
       │       │ Reservation │              │             │
       │       ├─────────────┤              │             │
       ├──────►│ storeId     │              │             │
       │       │ customer    │──────────────┘             │
       │       │ date/time   │                            │
       │       │ partySize   │                            │
       │       │ status      │                            │
       │       └─────────────┘                            │
       │                                                  │
       │       ┌─────────────┐                            │
       │       │    Order    │                            │
       │       ├─────────────┤                            │
       └──────►│ storeId     │────────────────────────────┘
               │ count       │
               │ price       │
               │ customer    │
               │ hash        │
               └─────────────┘
```

### Key Relationships

| Relationship | Type | Description |
|--------------|------|-------------|
| Store → Order | 1:N | Store has many orders |
| Store → MenuItem | 1:N | Store has many menu items |
| Store → Table | 1:N | Store has many tables |
| Store → Tab | 1:N | Store has many tabs |
| Store → Reservation | 1:N | Store has many reservations |
| Table → Tab | 1:N | Table can have multiple tabs |
| Tab → TabItem | 1:N | Tab contains multiple items |
| MenuItem → TabItem | 1:N | Menu item can be in many tabs |
| Reservation → Tab | 1:1 | Reservation can link to one tab |

### Indexes and Constraints

- **Unique**: `Table(storeId, number)` - Table numbers unique per store
- **Unique**: `Reservation(tabId)` - One reservation per tab

---

## Authentication

### Privy Integration

```
┌─────────────────────────────────────────────────────────┐
│                     PRIVY PROVIDER                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Email     │  │   Social    │  │   Wallet    │    │
│  │   Login     │  │   Login     │  │   Connect   │    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │
│         │                │                │            │
│         └────────────────┼────────────────┘            │
│                          │                             │
│                          ▼                             │
│                 ┌────────────────┐                     │
│                 │  Privy User    │                     │
│                 │  + Embedded    │                     │
│                 │    Wallet      │                     │
│                 └────────────────┘                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Authentication Flow

1. **User initiates login** via `LoginButton` component
2. **Privy handles OAuth/Email/Wallet** connection
3. **Embedded wallet created** automatically if social login
4. **User context available** via `usePrivy()` hook
5. **Wallet operations** via `useWallet()` custom hook

### Hooks API

```typescript
// Privy hooks
const { user, authenticated, login, logout } = usePrivy();

// Wallet operations
const { address, isConnected, getBalance, sendMOVE } = useWallet();
```

---

## Payment System

### x402 Payment Protocol

XStore implements HTTP 402 (Payment Required) for crypto payments:

```
┌──────────┐                    ┌──────────┐                    ┌──────────┐
│  Client  │                    │   API    │                    │Blockchain│
└────┬─────┘                    └────┬─────┘                    └────┬─────┘
     │                               │                               │
     │  1. POST /api/tabs/:id/close  │                               │
     │  (no payment header)          │                               │
     │──────────────────────────────>│                               │
     │                               │                               │
     │  2. 402 Payment Required      │                               │
     │  {payment: {amount, recipient}}                               │
     │<──────────────────────────────│                               │
     │                               │                               │
     │  3. sendMOVE(recipient, amount)                               │
     │──────────────────────────────────────────────────────────────>│
     │                               │                               │
     │  4. TX Hash                   │                               │
     │<──────────────────────────────────────────────────────────────│
     │                               │                               │
     │  5. POST /api/tabs/:id/close  │                               │
     │  Header: x-payment: <txHash>  │                               │
     │──────────────────────────────>│                               │
     │                               │  6. Verify & Update DB        │
     │  7. 200 OK                    │                               │
     │<──────────────────────────────│                               │
     │                               │                               │
```

### Payment Headers

**Request Headers:**
```
x-payment: <transaction-hash>
x-payment-recipient: <wallet-address>  // For reservations
```

**Response Headers (402):**
```
X-Payment-Required: {"version":"1","network":"movement-testnet","amount":"0.001","currency":"MOVE","recipient":"0x..."}
```

### Movement Chain Configuration

```typescript
// lib/chains.ts
export const movementTestnet = defineChain({
  id: 30732,
  name: 'Movement Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Move',
    symbol: 'MOVE',
  },
  rpcUrls: {
    default: { http: ['https://mevm.testnet.imola.movementlabs.xyz'] },
  },
  blockExplorers: {
    default: { url: 'https://explorer.movementlabs.xyz' },
  },
});
```

---

## State Management

### React Query Configuration

```typescript
// Data fetching with React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
});
```

### Custom Hooks Pattern

```typescript
// Generic query factory
export function createQueryHook<T>(
  keyPrefix: string,
  fetcher: (id: string) => Promise<T>
) {
  return function useQuery(id: string | undefined) {
    return useReactQuery({
      queryKey: [`${keyPrefix}_${id}`],
      queryFn: () => fetcher(id!),
      enabled: !!id,
    });
  };
}

// Usage
export const useStore = createQueryHook('store', fetchStore);
export const useTab = createQueryHook('tab', fetchTab);
```

### State Categories

| Category | Solution | Use Case |
|----------|----------|----------|
| Server State | React Query | API data, caching, refetching |
| Auth State | Privy Context | User, wallet, authentication |
| UI State | useState | Forms, modals, selections |
| URL State | Next.js Router | Navigation, dynamic routes |

---

## Security Considerations

### Input Validation
- Zod schemas for API request validation
- TypeScript types for compile-time safety

### Authentication
- Privy handles OAuth security
- Wallet signatures for blockchain transactions

### Data Protection
- Prisma parameterized queries prevent SQL injection
- Environment variables for sensitive configuration

### Payment Security
- Transaction hashes verified on-chain
- Direct wallet-to-wallet transfers (no custodial)

---

## Performance Optimizations

### Frontend
- **Code Splitting**: Next.js automatic route splitting
- **Image Optimization**: Next.js Image component
- **Caching**: React Query stale-while-revalidate

### Backend
- **Connection Pooling**: Prisma connection management
- **Indexed Queries**: Database indexes on frequently queried fields

### Blockchain
- **Read-only Client**: Viem public client for balance queries
- **Provider Caching**: Wallet provider reused across operations
