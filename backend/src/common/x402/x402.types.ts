/**
 * X402 Protocol Types
 * Based on https://github.com/coinbase/x402
 */

// X402 Header Names
export const X402_HEADERS = {
  PAYMENT_REQUIRED: 'X-PAYMENT-REQUIRED',
  PAYMENT: 'X-PAYMENT',
  PAYMENT_RESPONSE: 'X-PAYMENT-RESPONSE',
} as const;

// Payment scheme types
export type PaymentScheme = 'exact' | 'upto';

// Supported networks
export type NetworkId =
  | 'base'
  | 'base-sepolia'
  | 'ethereum'
  | 'ethereum-sepolia'
  | 'movement-testnet'
  | 'hardhat-local';

// Payment requirement sent in 402 response
export interface PaymentRequired {
  scheme: PaymentScheme;
  network: NetworkId;
  maxAmountRequired: string;
  resource: string;
  description?: string;
  mimeType?: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  extra?: {
    name?: string;
    version?: string;
  };
}

// ERC-3009 TransferWithAuthorization typed data
export interface TransferWithAuthorizationData {
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  };
  types: {
    TransferWithAuthorization: Array<{ name: string; type: string }>;
  };
  primaryType: 'TransferWithAuthorization';
  message: {
    from: string;
    to: string;
    value: string;
    validAfter: string;
    validBefore: string;
    nonce: string;
  };
}

// ERC-2612 Permit typed data (fallback)
export interface PermitData {
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  };
  types: {
    Permit: Array<{ name: string; type: string }>;
  };
  primaryType: 'Permit';
  message: {
    owner: string;
    spender: string;
    value: string;
    nonce: string;
    deadline: string;
  };
}

// Payment payload sent by client
export interface PaymentPayload {
  x402Version: number;
  scheme: PaymentScheme;
  network: NetworkId;
  payload: {
    signature: string;
    authorization: TransferWithAuthorizationData | PermitData;
  };
}

// Payment response from server
export interface PaymentResponse {
  success: boolean;
  txHash?: string;
  error?: string;
  network?: NetworkId;
}

// X402 Exception for 402 responses
export class X402PaymentRequiredException extends Error {
  public readonly paymentRequired: PaymentRequired;
  public readonly statusCode = 402;

  constructor(paymentRequired: PaymentRequired) {
    super('Payment Required');
    this.paymentRequired = paymentRequired;
  }
}
