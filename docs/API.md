# XStore API Reference

Complete API documentation for the XStore platform.

## Base URL

```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

## Authentication

XStore uses wallet-based authentication via Privy. Most endpoints use the customer's wallet address for identification.

---

## Stores

### List All Stores

```http
GET /api/stores
```

**Response:**
```json
[
  {
    "id": "clx123...",
    "name": "Coffee Shop",
    "description": "Best coffee in town",
    "price": "0.01",
    "menu": "Signature Latte",
    "image": "https://...",
    "owner": "0x...",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### Get Store by ID

```http
GET /api/stores/[id]
```

**Response:**
```json
{
  "id": "clx123...",
  "name": "Coffee Shop",
  "description": "Best coffee in town",
  "price": "0.01",
  "menu": "Signature Latte",
  "image": "https://...",
  "owner": "0x...",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Create Store

```http
POST /api/stores
```

**Request Body:**
```json
{
  "name": "Coffee Shop",
  "description": "Best coffee in town",
  "menu": "Signature Latte",
  "price": "0.01",
  "image": "https://...",
  "owner": "0x..."
}
```

**Response:** `201 Created`
```json
{
  "id": "clx123...",
  "name": "Coffee Shop",
  ...
}
```

### Update Store

```http
PUT /api/stores/[id]
```

**Request Body:**
```json
{
  "name": "Updated Name",
  "description": "Updated description"
}
```

### Delete Store

```http
DELETE /api/stores/[id]
```

**Response:** `200 OK`

---

## Menu Items

### List Menu Items

```http
GET /api/menu-items?storeId=[storeId]
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| storeId | string | Yes | Store ID to fetch items for |

**Response:**
```json
[
  {
    "id": "clx456...",
    "storeId": "clx123...",
    "name": "Espresso",
    "description": "Double shot espresso",
    "price": "0.005",
    "category": "Coffee",
    "available": true,
    "image": null
  }
]
```

### Create Menu Item

```http
POST /api/menu-items
```

**Request Body:**
```json
{
  "storeId": "clx123...",
  "name": "Espresso",
  "description": "Double shot espresso",
  "price": "0.005",
  "category": "Coffee"
}
```

---

## Tables

### List Tables

```http
GET /api/tables?storeId=[storeId]
```

**Response:**
```json
[
  {
    "id": "clx789...",
    "storeId": "clx123...",
    "number": 1,
    "name": "Window Seat",
    "seats": 4,
    "isActive": true
  }
]
```

### Get Table by ID

```http
GET /api/tables/[id]
```

### Create Table

```http
POST /api/tables
```

**Request Body:**
```json
{
  "storeId": "clx123...",
  "number": 1,
  "name": "Window Seat",
  "seats": 4
}
```

### Delete Table

```http
DELETE /api/tables/[id]
```

---

## Tabs

### List Tabs

```http
GET /api/tabs?storeId=[storeId]&customer=[address]&status=[status]
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| storeId | string | No | Filter by store |
| customer | string | No | Filter by customer wallet |
| status | string | No | Filter by status (OPEN, PENDING_PAYMENT, PAID, CANCELLED) |

**Response:**
```json
[
  {
    "id": "clxabc...",
    "storeId": "clx123...",
    "tableId": "clx789...",
    "customer": "0x...",
    "customerName": "John",
    "status": "OPEN",
    "totalAmount": "0.025",
    "items": [...],
    "table": {...},
    "store": {...}
  }
]
```

### Get Tab by ID

```http
GET /api/tabs/[id]
```

**Response:**
```json
{
  "id": "clxabc...",
  "storeId": "clx123...",
  "tableId": "clx789...",
  "customer": "0x...",
  "customerName": "John",
  "status": "OPEN",
  "totalAmount": "0.025",
  "paymentTxHash": null,
  "items": [
    {
      "id": "clxitem...",
      "name": "Espresso",
      "price": "0.005",
      "quantity": 2,
      "note": null
    }
  ],
  "table": {
    "number": 1,
    "name": "Window Seat"
  },
  "store": {
    "id": "clx123...",
    "name": "Coffee Shop",
    "owner": "0x..."
  }
}
```

### Create Tab

```http
POST /api/tabs
```

**Request Body:**
```json
{
  "storeId": "clx123...",
  "tableId": "clx789...",
  "customer": "0x...",
  "customerName": "John"
}
```

### Add Item to Tab

```http
POST /api/tabs/[id]/items
```

**Request Body:**
```json
{
  "menuItemId": "clx456...",
  "name": "Espresso",
  "price": "0.005",
  "quantity": 2,
  "note": "Extra hot"
}
```

### Close Tab (x402 Payment)

```http
POST /api/tabs/[id]/close
```

**Without Payment Header:**

Returns `402 Payment Required`:
```json
{
  "error": "Payment Required",
  "payment": {
    "version": "1",
    "network": "movement-testnet",
    "amount": "0.025",
    "currency": "MOVE",
    "recipient": "0x...",
    "description": "Payment for tab at Coffee Shop",
    "tabId": "clxabc...",
    "items": [
      {
        "name": "Espresso",
        "quantity": 2,
        "price": "0.005"
      }
    ]
  }
}
```

**Response Headers:**
```
X-Payment-Required: {"version":"1","network":"movement-testnet","amount":"0.025","currency":"MOVE","recipient":"0x..."}
```

**With Payment Header:**

```http
POST /api/tabs/[id]/close
x-payment: 0x123abc...
```

Returns `200 OK`:
```json
{
  "success": true,
  "tab": {
    "id": "clxabc...",
    "status": "PAID",
    "totalAmount": "0.025",
    "paymentTxHash": "0x123abc...",
    "closedAt": "2024-01-01T12:00:00.000Z"
  },
  "message": "Tab closed successfully"
}
```

---

## Reservations

### List Reservations

```http
GET /api/reservations?storeId=[storeId]&customer=[address]
```

**Response:**
```json
[
  {
    "id": "clxres...",
    "storeId": "clx123...",
    "customer": "0x...",
    "customerName": "Jane",
    "phone": "+1234567890",
    "date": "2024-01-15T00:00:00.000Z",
    "time": "19:00",
    "partySize": 4,
    "note": "Birthday dinner",
    "status": "CONFIRMED",
    "paymentTxHash": "0x...",
    "store": {...}
  }
]
```

### Create Reservation (x402 Payment)

```http
POST /api/reservations
```

**Request Body:**
```json
{
  "storeId": "clx123...",
  "customer": "0x...",
  "customerName": "Jane",
  "phone": "+1234567890",
  "date": "2024-01-15",
  "time": "19:00",
  "partySize": 4,
  "note": "Birthday dinner"
}
```

**Without Payment Header:**

Returns `402 Payment Required`:
```json
{
  "error": "Payment Required",
  "payment": {
    "version": "1",
    "network": "movement-testnet",
    "amount": "0.001",
    "currency": "MOVE",
    "recipient": "0x...",
    "description": "Reservation deposit"
  }
}
```

**With Payment Header:**

```http
POST /api/reservations
x-payment: 0x123abc...
x-payment-recipient: 0x...
```

Request body also includes:
```json
{
  ...
  "paymentTxHash": "0x123abc..."
}
```

### Update Reservation

```http
PUT /api/reservations/[id]
```

**Request Body:**
```json
{
  "status": "CONFIRMED"
}
```

---

## Orders

### List Orders

```http
GET /api/orders?storeId=[storeId]&customer=[address]
```

**Response:**
```json
[
  {
    "id": "clxord...",
    "storeId": "clx123...",
    "count": "2",
    "price": "0.02",
    "customer": "0x...",
    "hash": "0x...",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "store": {...}
  }
]
```

### Create Order

```http
POST /api/orders
```

**Request Body:**
```json
{
  "storeId": "clx123...",
  "count": "2",
  "price": "0.02",
  "customer": "0x...",
  "hash": "0x..."
}
```

---

## Error Responses

### Standard Error Format

```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input |
| 402 | Payment Required - x402 flow |
| 404 | Not Found |
| 500 | Internal Server Error |

### Common Errors

**400 Bad Request:**
```json
{
  "error": "Missing required fields"
}
```

**402 Payment Required:**
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

**404 Not Found:**
```json
{
  "error": "Tab not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to create store"
}
```

---

## x402 Payment Protocol

### Overview

The x402 protocol implements HTTP 402 Payment Required for cryptocurrency payments:

1. Client makes request without payment
2. Server returns 402 with payment details
3. Client sends payment on blockchain
4. Client retries with transaction hash
5. Server verifies and processes request

### Payment Required Response

**HTTP Status:** `402 Payment Required`

**Headers:**
```
Content-Type: application/json
X-Payment-Required: {"version":"1","network":"movement-testnet","amount":"0.001","currency":"MOVE","recipient":"0x..."}
```

**Body:**
```json
{
  "error": "Payment Required",
  "payment": {
    "version": "1",
    "network": "movement-testnet",
    "amount": "0.001",
    "currency": "MOVE",
    "recipient": "0x...",
    "description": "Payment description"
  }
}
```

### Payment Headers

When retrying after payment:

```
x-payment: <transaction-hash>
```

For reservations, also include:
```
x-payment-recipient: <store-owner-address>
```

### Supported Endpoints

| Endpoint | Required Amount |
|----------|-----------------|
| `POST /api/tabs/[id]/close` | Tab total |
| `POST /api/reservations` | 0.001 MOVE |

---

## Rate Limits

Currently no rate limits are enforced. This may change in production.

---

## Pagination

Currently not implemented. All endpoints return full result sets.

---

## Filtering

### Query String Filters

Most list endpoints support filtering:

```http
GET /api/tabs?storeId=xxx&customer=0x...&status=OPEN
```

### Available Filters

| Endpoint | Filters |
|----------|---------|
| `/api/stores` | None |
| `/api/menu-items` | storeId |
| `/api/tables` | storeId |
| `/api/tabs` | storeId, customer, status |
| `/api/reservations` | storeId, customer |
| `/api/orders` | storeId, customer |
