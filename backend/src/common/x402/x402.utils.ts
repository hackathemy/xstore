/**
 * X402 Protocol Utilities
 * Base64 encoding/decoding for headers
 */

import { PaymentRequired, PaymentPayload, PaymentResponse } from './x402.types';

/**
 * Safe Base64 encode (supports Unicode)
 */
export function safeBase64Encode(data: unknown): string {
  const jsonString = JSON.stringify(data);
  // Handle Unicode by encoding to UTF-8 first
  const bytes = new TextEncoder().encode(jsonString);
  const binaryString = Array.from(bytes)
    .map((byte) => String.fromCharCode(byte))
    .join('');
  return Buffer.from(binaryString, 'binary').toString('base64');
}

/**
 * Safe Base64 decode (supports Unicode)
 */
export function safeBase64Decode<T>(encoded: string): T {
  const binaryString = Buffer.from(encoded, 'base64').toString('binary');
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const jsonString = new TextDecoder().decode(bytes);
  return JSON.parse(jsonString) as T;
}

/**
 * Encode PaymentRequired for header
 */
export function encodePaymentRequired(paymentRequired: PaymentRequired): string {
  return safeBase64Encode(paymentRequired);
}

/**
 * Decode PaymentRequired from header
 */
export function decodePaymentRequired(encoded: string): PaymentRequired {
  return safeBase64Decode<PaymentRequired>(encoded);
}

/**
 * Encode PaymentPayload for header
 */
export function encodePaymentPayload(payload: PaymentPayload): string {
  return safeBase64Encode(payload);
}

/**
 * Decode PaymentPayload from header
 */
export function decodePaymentPayload(encoded: string): PaymentPayload {
  return safeBase64Decode<PaymentPayload>(encoded);
}

/**
 * Encode PaymentResponse for header
 */
export function encodePaymentResponse(response: PaymentResponse): string {
  return safeBase64Encode(response);
}

/**
 * Decode PaymentResponse from header
 */
export function decodePaymentResponse(encoded: string): PaymentResponse {
  return safeBase64Decode<PaymentResponse>(encoded);
}

/**
 * Parse X-PAYMENT header from request
 */
export function parsePaymentHeader(headerValue: string | undefined): PaymentPayload | null {
  if (!headerValue) {
    return null;
  }

  try {
    return decodePaymentPayload(headerValue);
  } catch (error) {
    console.error('Failed to parse X-PAYMENT header:', error);
    return null;
  }
}

/**
 * Generate random nonce for ERC-3009
 */
export function generateNonce(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}
