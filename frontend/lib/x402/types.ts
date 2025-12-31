/**
 * X402 Protocol Types for Frontend
 * Compatible with Movement Network (Move VM) stablecoin payments
 */

export type StablecoinSymbol = 'USDC' | 'USDT';

// X402 Payment Required Response (from HTTP 402)
export interface X402PaymentRequired {
  version: '1.0';
  network: {
    name: string;
    chainId: string;
    nodeUrl: string;
  };
  payment: {
    paymentId: string;
    recipient: string;
    amount: string;
    currency: StablecoinSymbol;
    coinType: string;
    decimals: number;
  };
  transaction: {
    function: string;
    typeArguments: string[];
    arguments: string[];
  };
  expiresAt: string;
  facilitator: {
    address: string;
    verifyEndpoint: string;
  };
}

// X-Payment Header format
export interface X402PaymentHeader {
  paymentId: string;
  payer: string;
  txHash: string;
  timestamp: number;
  signature?: string;
}

// X-Payment-Receipt format
export interface X402PaymentReceipt {
  paymentId: string;
  txHash: string;
  status: 'verified' | 'pending' | 'failed';
  block?: {
    height: number;
    timestamp: number;
  };
  issuedAt: number;
  facilitatorSignature?: string;
}

// Verification result
export interface X402VerificationResult {
  valid: boolean;
  paymentId: string;
  txHash: string;
  status: 'success' | 'pending' | 'failed';
  error?: string;
  receipt?: X402PaymentReceipt;
}

// X402 Error
export interface X402Error {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Payment state for UI
export type X402PaymentState =
  | 'idle'
  | 'requesting'
  | 'awaiting_payment'
  | 'signing'
  | 'submitting'
  | 'verifying'
  | 'completed'
  | 'failed';

// X402 Protocol info
export interface X402ProtocolInfo {
  protocol: string;
  version: string;
  adapter: string;
  gasSponsorship: {
    enabled: boolean;
    facilitatorAddress?: string;
    facilitatorBalance?: string;
  };
  network: {
    name: string;
    nodeUrl: string;
    chainId: number;
    isTestnet: boolean;
    facilitatorAddress: string | null;
    stablecoinEnabled: boolean;
    stablecoin: {
      symbol: string;
      name: string;
      coinType: string;
      decimals: number;
    };
    supportedStablecoins: string[];
  };
  endpoints: {
    request: string;
    buildSponsored: string;
    submitSponsored: string;
    verify: string;
    submit: string;
  };
  headers: {
    payment: string;
    receipt: string;
    required: string;
  };
  supportedCurrencies: string[];
  defaultCurrency: string;
}

// Sponsored transaction response
export interface X402SponsoredTransaction {
  paymentId: string;
  transactionBytes: string;
  feePayerAddress: string;
  payment: {
    amount: string;
    amountFormatted: string;
    currency: string;
    coinType: string;
    decimals: number;
    recipient: string;
  };
  message: string;
}

// Header names
export const X402_HEADERS = {
  PAYMENT: 'X-Payment',
  PAYMENT_RECEIPT: 'X-Payment-Receipt',
  PAYMENT_REQUIRED: 'X-Payment-Required',
} as const;

// Helper functions
export function encodeX402Header(data: X402PaymentHeader): string {
  return btoa(JSON.stringify(data));
}

export function decodeX402PaymentRequired(header: string): X402PaymentRequired {
  try {
    return JSON.parse(atob(header));
  } catch {
    throw new Error('Invalid X-Payment-Required header');
  }
}

export function decodeX402Receipt(header: string): X402PaymentReceipt {
  try {
    return JSON.parse(atob(header));
  } catch {
    throw new Error('Invalid X-Payment-Receipt header');
  }
}

// Format amount for display
export function formatX402Amount(amount: string, decimals: number): string {
  const value = Number(amount) / Math.pow(10, decimals);
  return value.toFixed(2);
}
