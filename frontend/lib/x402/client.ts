/**
 * X402 Client for Movement Network
 * Handles HTTP 402 payment flows with stablecoin support
 */

import axios, { AxiosError } from 'axios';
import {
  X402PaymentRequired,
  X402PaymentHeader,
  X402PaymentReceipt,
  X402VerificationResult,
  X402ProtocolInfo,
  X402SponsoredTransaction,
  X402_HEADERS,
  StablecoinSymbol,
  encodeX402Header,
  decodeX402Receipt,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

/**
 * X402 Client class for managing payment flows
 */
export class X402Client {
  private baseUrl: string;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Get X402 protocol information
   */
  async getProtocolInfo(): Promise<X402ProtocolInfo> {
    const response = await axios.get<X402ProtocolInfo>(`${this.baseUrl}/x402/info`);
    return response.data;
  }

  /**
   * Request payment (triggers HTTP 402)
   * Returns payment requirements from the 402 response
   */
  async requestPayment(params: {
    tabId: string;
    payerAddress: string;
    currency?: StablecoinSymbol;
  }): Promise<X402PaymentRequired> {
    try {
      await axios.post(`${this.baseUrl}/x402/request`, params);
      // Should not reach here - expecting 402 response
      throw new Error('Expected HTTP 402 response');
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 402) {
        // Extract X402 payment required from response
        const paymentRequired = error.response.data as X402PaymentRequired;
        return paymentRequired;
      }
      throw error;
    }
  }

  /**
   * Verify payment using X-Payment header
   */
  async verifyPaymentWithHeader(paymentHeader: X402PaymentHeader): Promise<{
    result: X402VerificationResult;
    receipt?: X402PaymentReceipt;
  }> {
    const encodedHeader = encodeX402Header(paymentHeader);

    const response = await axios.post<X402VerificationResult>(
      `${this.baseUrl}/x402/verify`,
      {},
      {
        headers: {
          [X402_HEADERS.PAYMENT]: encodedHeader,
        },
      }
    );

    // Check for receipt in response headers
    let receipt: X402PaymentReceipt | undefined;
    const receiptHeader = response.headers[X402_HEADERS.PAYMENT_RECEIPT.toLowerCase()];
    if (receiptHeader) {
      receipt = decodeX402Receipt(receiptHeader);
    }

    return {
      result: response.data,
      receipt,
    };
  }

  /**
   * Submit payment for verification (body-based)
   */
  async submitPayment(params: {
    paymentId: string;
    txHash: string;
  }): Promise<X402VerificationResult> {
    const response = await axios.post<X402VerificationResult>(
      `${this.baseUrl}/x402/submit`,
      params
    );
    return response.data;
  }

  /**
   * Build Move transaction payload from X402 payment requirements
   */
  buildTransactionPayload(paymentRequired: X402PaymentRequired) {
    const { transaction, payment } = paymentRequired;

    return {
      function: transaction.function,
      typeArguments: transaction.typeArguments,
      functionArguments: [
        payment.paymentId,
        payment.recipient,
        BigInt(payment.amount),
      ],
    };
  }

  /**
   * Check if payment is expired
   */
  isPaymentExpired(paymentRequired: X402PaymentRequired): boolean {
    return new Date(paymentRequired.expiresAt) < new Date();
  }

  // ==========================================
  // Gas Sponsorship Methods (X402 Standard)
  // ==========================================

  /**
   * Build a sponsored transaction (gas paid by facilitator)
   */
  async buildSponsoredTransaction(params: {
    tabId: string;
    payerAddress: string;
    currency?: StablecoinSymbol;
  }): Promise<X402SponsoredTransaction> {
    const response = await axios.post<X402SponsoredTransaction>(
      `${this.baseUrl}/x402/build-sponsored`,
      params
    );
    return response.data;
  }

  /**
   * Submit a sponsored transaction
   * Client sends signed transaction bytes, facilitator co-signs and submits
   */
  async submitSponsoredTransaction(params: {
    paymentId: string;
    transactionBytes: string;
    senderAuthenticatorBytes: string;
  }): Promise<X402VerificationResult> {
    const response = await axios.post<X402VerificationResult>(
      `${this.baseUrl}/x402/submit-sponsored`,
      params
    );
    return response.data;
  }

  /**
   * Check gas sponsorship availability
   */
  async checkSponsorshipStatus(): Promise<{
    available: boolean;
    facilitatorAddress?: string;
    balance?: string;
  }> {
    const response = await axios.get(`${this.baseUrl}/x402/sponsorship-status`);
    return response.data;
  }
}

// Singleton instance
let x402ClientInstance: X402Client | null = null;

export function getX402Client(): X402Client {
  if (!x402ClientInstance) {
    x402ClientInstance = new X402Client();
  }
  return x402ClientInstance;
}

// Export convenience functions
export async function requestX402Payment(params: {
  tabId: string;
  payerAddress: string;
  currency?: StablecoinSymbol;
}): Promise<X402PaymentRequired> {
  return getX402Client().requestPayment(params);
}

export async function verifyX402Payment(
  paymentHeader: X402PaymentHeader
): Promise<X402VerificationResult> {
  const { result } = await getX402Client().verifyPaymentWithHeader(paymentHeader);
  return result;
}

export async function submitX402Payment(params: {
  paymentId: string;
  txHash: string;
}): Promise<X402VerificationResult> {
  return getX402Client().submitPayment(params);
}
