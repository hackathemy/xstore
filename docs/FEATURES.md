# XStore Features Guide

This document provides detailed information about XStore's features and how to use them.

## Table of Contents

- [Store Management](#store-management)
- [Menu Management](#menu-management)
- [Table & QR System](#table--qr-system)
- [Tab System](#tab-system)
- [Reservation System](#reservation-system)
- [Payment Processing](#payment-processing)
- [Customer Experience](#customer-experience)

---

## Store Management

### Creating a Store

Store owners can create their crypto-enabled store in seconds:

1. **Navigate to** `/make-store`
2. **Fill in store details:**
   - Store Name
   - Description
   - Default Menu Item
   - Price (in MOVE)
   - Store Image URL
3. **Submit** - Your wallet address becomes the store owner

**Technical Implementation:**
```typescript
// POST /api/stores
{
  name: "Coffee Shop",
  description: "Best coffee in town",
  menu: "Signature Latte",
  price: "0.01",
  image: "https://...",
  owner: "0x..." // From connected wallet
}
```

### Store Dashboard

Access your store management at `/manage`:

- **Tables Tab**: Add and manage tables with QR codes
- **Menu Tab**: Add and organize menu items
- **Active Tabs Tab**: Monitor open customer tabs

### Store Visibility

Stores are publicly visible at:
- `/stores` - Store listing page
- `/store/[id]` - Individual store page

---

## Menu Management

### Adding Menu Items

1. Go to **Manage** → **Menu Tab**
2. Click **+ Add Item**
3. Enter:
   - Item Name
   - Description (optional)
   - Price in MOVE
   - Category (e.g., "Main", "Drinks", "Desserts")

### Menu Categories

Items are automatically grouped by category:

```
Menu
├── Main Dishes
│   ├── Burger - 0.02 MOVE
│   └── Pizza - 0.025 MOVE
├── Drinks
│   ├── Coffee - 0.005 MOVE
│   └── Juice - 0.008 MOVE
└── Desserts
    └── Cake - 0.01 MOVE
```

### Menu Display

Customers see the menu when:
- Visiting the store page directly
- Scanning a table QR code
- Adding items to their tab

---

## Table & QR System

### Adding Tables

1. Go to **Manage** → **Tables Tab**
2. Click **+ Add Table**
3. Enter:
   - Table Number (unique per store)
   - Table Name (optional, e.g., "Window Seat")
   - Seat Count

### QR Code Generation

Each table automatically generates a QR code:

```
QR Code URL: /store/[storeId]/table/[tableId]
```

**Use Cases:**
- Print QR codes for physical tables
- Customers scan to view menu and order
- Orders automatically associated with table

### QR Code Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Customer   │     │   Mobile    │     │   XStore    │
│  Scans QR   │────>│   Browser   │────>│  Table Page │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                        ┌──────▼──────┐
                                        │  View Menu  │
                                        │  Add Items  │
                                        │  Open Tab   │
                                        └─────────────┘
```

---

## Tab System

The tab system allows customers to accumulate orders and pay when ready.

### Opening a Tab

1. **Automatic**: When customer adds first item at a table
2. **Manual**: Tab created via API

**Tab States:**
| Status | Description | Color |
|--------|-------------|-------|
| OPEN | Active tab, can add items | Green |
| PENDING_PAYMENT | Payment requested | Yellow |
| PAID | Payment complete | Blue |
| CANCELLED | Tab cancelled | Red |

### Adding Items to Tab

From the table ordering page:

1. Browse menu items
2. Click **Add** to add to cart
3. Adjust quantities with +/- buttons
4. Click **Open Tab & Order** or **Add to Tab**

**API Flow:**
```typescript
// Create tab
POST /api/tabs
{ storeId, tableId, customer, customerName }

// Add items
POST /api/tabs/[id]/items
{ menuItemId, name, price, quantity }
```

### Viewing Tab

Customers can view their tab at `/tab/[id]`:
- List of all items ordered
- Running total
- Table information
- Pay button

### Tab Calculation

```typescript
totalAmount = items.reduce((sum, item) =>
  sum + (parseFloat(item.price) * item.quantity), 0
);
```

---

## Reservation System

### Making a Reservation

1. Navigate to `/store/[id]/reserve`
2. Fill in:
   - Name (required)
   - Phone (optional)
   - Date (required)
   - Time (required)
   - Party Size (required)
   - Special Requests (optional)
3. Pay reservation fee (0.001 MOVE)

### Reservation Fee

A small deposit prevents no-shows:
- **Amount**: 0.001 MOVE
- **Recipient**: Store owner
- **Purpose**: Commitment fee

### Reservation Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Customer   │     │   API       │     │ Blockchain  │
│  Submits    │────>│   Returns   │     │             │
│  Form       │     │   402       │     │             │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                    ┌──────▼──────┐
                    │   Customer  │
                    │   Pays Fee  │───────────────┐
                    └─────────────┘               │
                                                  ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Reservation │◄────│   API       │◄────│   TX Hash   │
│  Confirmed  │     │   Verifies  │     │   Received  │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Reservation Statuses

| Status | Description |
|--------|-------------|
| PENDING | Awaiting confirmation |
| CONFIRMED | Reservation confirmed |
| CANCELLED | Customer or owner cancelled |
| COMPLETED | Customer visited |

### Viewing Reservations

- **Customers**: `/reservations` shows their reservations
- **Store Owners**: Can view in dashboard

---

## Payment Processing

### x402 Payment Protocol

XStore implements the HTTP 402 Payment Required standard:

1. **Initial Request**: Client requests action requiring payment
2. **402 Response**: Server returns payment requirements
3. **Payment**: Client sends crypto to specified address
4. **Retry with Proof**: Client retries with transaction hash
5. **Confirmation**: Server verifies and completes action

### Payment Flow Example (Closing Tab)

```javascript
// Step 1: Request to close tab
const response = await fetch(`/api/tabs/${tabId}/close`, {
  method: 'POST'
});

// Step 2: Handle 402
if (response.status === 402) {
  const { payment } = await response.json();

  // Step 3: Send payment
  const txHash = await sendMOVE(payment.recipient, payment.amount);

  // Step 4: Retry with proof
  await fetch(`/api/tabs/${tabId}/close`, {
    method: 'POST',
    headers: { 'x-payment': txHash }
  });
}
```

### Supported Payment Types

| Action | Endpoint | Fee |
|--------|----------|-----|
| Close Tab | `/api/tabs/[id]/close` | Tab total |
| Make Reservation | `/api/reservations` | 0.001 MOVE |

### Transaction Verification

After payment:
1. Transaction hash stored in database
2. Link to blockchain explorer provided
3. Payment status updated

---

## Customer Experience

### Home Page

The home page (`/`) displays:
- Feature highlights
- Quick action buttons
- Store discovery

### Store Discovery

At `/stores`:
- Browse all stores
- View store details
- Quick order access

### My Tabs

At `/my-tabs`:
- View all open tabs
- View payment history
- Access active orders

### My Reservations

At `/reservations`:
- View upcoming reservations
- Check reservation status
- See reservation history

### Order History

At `/order`:
- View past orders
- Order details and amounts

### Mobile-First Design

All pages optimized for mobile:
- Touch-friendly buttons
- Swipe-friendly cards
- Responsive layouts
- Bottom action bars

---

## User Flows

### Store Owner Flow

```
1. Connect Wallet
        │
        ▼
2. Create Store (/make-store)
        │
        ▼
3. Add Tables (/manage → Tables)
        │
        ▼
4. Add Menu Items (/manage → Menu)
        │
        ▼
5. Print QR Codes
        │
        ▼
6. Monitor Tabs (/manage → Active Tabs)
```

### Customer Ordering Flow

```
1. Scan Table QR Code
        │
        ▼
2. Connect Wallet (if needed)
        │
        ▼
3. Browse Menu
        │
        ▼
4. Add Items to Cart
        │
        ▼
5. Open Tab / Add to Existing Tab
        │
        ▼
6. (Optional) Order More
        │
        ▼
7. View Tab (/tab/[id])
        │
        ▼
8. Pay with MOVE
        │
        ▼
9. Receipt / Confirmation
```

### Customer Reservation Flow

```
1. Visit Store Page (/store/[id])
        │
        ▼
2. Click "Reserve" Button
        │
        ▼
3. Fill Reservation Form
        │
        ▼
4. Submit (triggers 402)
        │
        ▼
5. Pay Deposit (0.001 MOVE)
        │
        ▼
6. Reservation Confirmed
        │
        ▼
7. View at /reservations
```

---

## Tips for Store Owners

### Optimize Your Store

1. **Clear Images**: Use high-quality store images
2. **Descriptive Menu**: Add descriptions to menu items
3. **Categories**: Organize menu by logical categories
4. **Table Names**: Use descriptive names like "Patio 1", "Bar Seat"

### Print QR Codes

1. Go to Manage → Tables
2. Each table shows a QR code
3. Right-click → Save/Print
4. Place at physical tables

### Monitor Activity

- Check "Active Tabs" regularly
- Track popular items
- Monitor reservation requests

---

## Tips for Customers

### Smooth Ordering

1. **Connect Wallet First**: Speeds up checkout
2. **Check Balance**: Ensure sufficient MOVE
3. **Add All Items**: Add everything before opening tab
4. **Keep Tab Open**: Can add more items anytime

### Payment Tips

1. **Sufficient Gas**: Keep extra MOVE for gas fees
2. **Wait for Confirmation**: Don't refresh during payment
3. **Save TX Hash**: Receipt includes transaction link

### Reservation Tips

1. **Book Early**: Popular times fill up
2. **Accurate Party Size**: Helps store prepare
3. **Add Notes**: Special requests in notes field
