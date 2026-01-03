/**
 * X402 Protocol Types for Movement Network (Move VM)
 * Move-based stablecoin payments with gas sponsorship
 */

// Supported stablecoins on Movement Network
export type StablecoinSymbol = 'USDC' | 'USDT';

export interface StablecoinConfig {
  symbol: string;
  name: string;
  coinType: string;
  decimals: number;
}

// X402 Payment Required Response (HTTP 402)
export interface X402PaymentRequired {
  // Protocol version
  version: '1.0';

  // Network information
  network: {
    name: string;
    chainId: string;
    nodeUrl: string;
  };

  // Payment details
  payment: {
    paymentId: string;
    recipient: string;
    amount: string;
    currency: StablecoinSymbol;
    coinType: string;
    decimals: number;
  };

  // Transaction template for Move
  transaction: {
    function: string;
    typeArguments: string[];
    arguments: string[];
  };

  // Expiration
  expiresAt: string;

  // Facilitator info
  facilitator: {
    address: string;
    verifyEndpoint: string;
  };
}

// X-Payment Header format (base64 encoded JSON)
export interface X402PaymentHeader {
  // Payment ID from PaymentRequired response
  paymentId: string;

  // Payer information
  payer: string;

  // Submitted transaction hash
  txHash: string;

  // Timestamp of submission
  timestamp: number;

  // Optional: signature for additional verification
  signature?: string;
}

// X-Payment-Receipt Header format (base64 encoded JSON)
export interface X402PaymentReceipt {
  // Payment ID
  paymentId: string;

  // Transaction hash
  txHash: string;

  // Verification status
  status: 'verified' | 'pending' | 'failed';

  // Block information
  block?: {
    height: number;
    timestamp: number;
  };

  // Receipt timestamp
  issuedAt: number;

  // Facilitator signature (optional)
  facilitatorSignature?: string;
}

// Payment verification result
export interface X402VerificationResult {
  valid: boolean;
  paymentId: string;
  txHash: string;
  status: 'success' | 'pending' | 'failed';
  error?: string;
  receipt?: X402PaymentReceipt;
}

// X402 Error response
export interface X402Error {
  code: X402ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export enum X402ErrorCode {
  PAYMENT_REQUIRED = 'PAYMENT_REQUIRED',
  INVALID_PAYMENT = 'INVALID_PAYMENT',
  PAYMENT_EXPIRED = 'PAYMENT_EXPIRED',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  VERIFICATION_FAILED = 'VERIFICATION_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
}

// Helper functions for header encoding/decoding
export function encodeX402Header(data: X402PaymentHeader | X402PaymentReceipt): string {
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

export function decodeX402PaymentHeader(header: string): X402PaymentHeader {
  try {
    const decoded = Buffer.from(header, 'base64').toString('utf-8');
    return JSON.parse(decoded) as X402PaymentHeader;
  } catch {
    throw new Error('Invalid X-Payment header format');
  }
}

export function decodeX402Receipt(header: string): X402PaymentReceipt {
  try {
    const decoded = Buffer.from(header, 'base64').toString('utf-8');
    return JSON.parse(decoded) as X402PaymentReceipt;
  } catch {
    throw new Error('Invalid X-Payment-Receipt header format');
  }
}

// Constants
export const X402_HEADERS = {
  PAYMENT: 'X-Payment',
  PAYMENT_RECEIPT: 'X-Payment-Receipt',
  PAYMENT_REQUIRED: 'X-Payment-Required',
} as const;

export const X402_CONTENT_TYPE = 'application/x402+json';

// Default expiration time (5 minutes)
export const X402_DEFAULT_EXPIRY_MS = 5 * 60 * 1000;
