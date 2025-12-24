# XStore

A modern crypto-powered store management and ordering platform.

## Features

- **Easy Store Creation**: Create your crypto store in seconds
- **QR Code Ordering**: Customers scan QR codes to browse and order
- **Cryptocurrency Payments**: Accept MOVE payments on Movement chain
- **Social Login**: Login with email, wallet, or Google via Privy
- **Real-time Orders**: Track orders in real-time

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (Docker)
- **Authentication**: Privy
- **Blockchain**: Movement chain (Chain ID: 3073)

## Getting Started

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Privy App ID (get from https://console.privy.io)

### Setup

1. Clone the repository:
```bash
git clone <repo-url>
cd xstore
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env
```

4. Update `.env` with your Privy App ID:
```
NEXT_PUBLIC_PRIVY_APP_ID="your-privy-app-id"
```

5. Start the database:
```bash
npm run docker:up
```

6. Initialize the database:
```bash
npm run db:push
```

7. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run docker:up` | Start PostgreSQL container |
| `npm run docker:down` | Stop PostgreSQL container |
| `npm run db:push` | Push schema to database |
| `npm run db:migrate` | Run database migrations |
| `npm run db:studio` | Open Prisma Studio |

## Project Structure

```
xstore/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── stores/        # Store CRUD endpoints
│   │   └── orders/        # Order endpoints
│   ├── make-store/        # Store creation page
│   ├── order/             # Orders management
│   └── store/[id]/        # Public store page
├── components/            # React components
├── context/               # Privy provider
├── hooks/                 # Custom hooks
├── lib/                   # Utilities & Prisma client
├── prisma/                # Database schema
├── public/                # Static assets
└── types/                 # TypeScript types
```

## License

MIT
