'use client';

import { useState, useCallback } from 'react';
import { Aptos, AptosConfig, Account, Ed25519PrivateKey, Deserializer, SimpleTransaction } from '@aptos-labs/ts-sdk';
import {
  X402PaymentState,
  X402VerificationResult,
  X402SponsoredTransaction,
  StablecoinSymbol,
  formatX402Amount,
} from './types';
import { getX402Client } from './client';

// Movement Network configuration
const MOVEMENT_TESTNET_URL = 'https://aptos.testnet.bardock.movementlabs.xyz/v1';

interface UseX402PaymentOptions {
  onSuccess?: (result: X402VerificationResult) => void;
  onError?: (error: Error) => void;
}

interface UseX402PaymentReturn {
  // State
  state: X402PaymentState;
  sponsoredTx: X402SponsoredTransaction | null;
  error: string | null;
  txHash: string | null;

  // Actions
  requestPayment: (params: {
    tabId: string;
    payerAddress: string;
    currency?: StablecoinSymbol;
  }) => Promise<X402SponsoredTransaction | null>;

  executePayment: (privateKey: string) => Promise<X402VerificationResult | null>;

  reset: () => void;

  // Helpers
  formatAmount: (decimals?: number) => string;
  isGasSponsorshipAvailable: () => Promise<boolean>;
}

/**
 * React hook for X402 payment flow with gas sponsorship
 * Uses fee payer transactions - user only pays USDC, facilitator pays gas
 */
export function useX402Payment(options: UseX402PaymentOptions = {}): UseX402PaymentReturn {
  const { onSuccess, onError } = options;

  const [state, setState] = useState<X402PaymentState>('idle');
  const [sponsoredTx, setSponsoredTx] = useState<X402SponsoredTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const client = getX402Client();

  /**
   * Request sponsored payment - builds a fee payer transaction
   * User only needs to sign as sender, gas will be paid by facilitator
   */
  const requestPayment = useCallback(async (params: {
    tabId: string;
    payerAddress: string;
    currency?: StablecoinSymbol;
  }) => {
    try {
      setState('requesting');
      setError(null);

      // Build sponsored transaction (facilitator pays gas)
      const sponsored = await client.buildSponsoredTransaction(params);
      setSponsoredTx(sponsored);
      setState('awaiting_payment');
      return sponsored;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to request payment';
      setError(message);
      setState('failed');
      onError?.(err instanceof Error ? err : new Error(message));
      return null;
    }
  }, [client, onError]);

  /**
   * Execute sponsored payment on Movement Network
   * User signs as sender only, facilitator co-signs as fee payer and submits
   */
  const executePayment = useCallback(async (privateKey: string) => {
    if (!sponsoredTx) {
      setError('No sponsored transaction - call requestPayment first');
      return null;
    }

    try {
      setState('signing');

      // Initialize Aptos client for signing
      const config = new AptosConfig({ fullnode: MOVEMENT_TESTNET_URL });
      const aptos = new Aptos(config);

      // Create account from private key
      const ed25519Key = new Ed25519PrivateKey(privateKey);
      const account = Account.fromPrivateKey({ privateKey: ed25519Key });

      // Deserialize the transaction from server
      const txBytes = new Uint8Array(Buffer.from(sponsoredTx.transactionBytes, 'hex'));
      const transaction = SimpleTransaction.deserialize(new Deserializer(txBytes));

      // Sign as sender only (not as fee payer - facilitator will do that)
      const senderAuthenticator = aptos.transaction.sign({
        signer: account,
        transaction,
      });

      // Serialize the authenticator to send to server
      const senderAuthenticatorBytes = Buffer.from(senderAuthenticator.bcsToBytes()).toString('hex');

      setState('submitting');

      // Submit to server - facilitator will co-sign as fee payer and broadcast
      const result = await client.submitSponsoredTransaction({
        paymentId: sponsoredTx.paymentId,
        transactionBytes: sponsoredTx.transactionBytes,
        senderAuthenticatorBytes,
      });

      if (result.valid && result.txHash) {
        setTxHash(result.txHash);
        setState('completed');
        onSuccess?.(result);
      } else {
        setError(result.error || 'Payment verification failed');
        setState('failed');
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment execution failed';
      setError(message);
      setState('failed');
      onError?.(err instanceof Error ? err : new Error(message));
      return null;
    }
  }, [sponsoredTx, client, onSuccess, onError]);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setState('idle');
    setSponsoredTx(null);
    setError(null);
    setTxHash(null);
  }, []);

  /**
   * Format payment amount for display
   */
  const formatAmount = useCallback((decimals?: number) => {
    if (!sponsoredTx) return '0.00';
    return formatX402Amount(
      sponsoredTx.payment.amount,
      decimals ?? sponsoredTx.payment.decimals
    );
  }, [sponsoredTx]);

  /**
   * Check if gas sponsorship is available
   */
  const isGasSponsorshipAvailable = useCallback(async () => {
    try {
      const status = await client.checkSponsorshipStatus();
      return status.available;
    } catch {
      return false;
    }
  }, [client]);

  return {
    state,
    sponsoredTx,
    error,
    txHash,
    requestPayment,
    executePayment,
    reset,
    formatAmount,
    isGasSponsorshipAvailable,
  };
}

/**
 * Hook for checking X402 protocol status
 */
export function useX402Status() {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [facilitatorAddress, setFacilitatorAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const checkStatus = useCallback(async () => {
    setLoading(true);
    try {
      const client = getX402Client();
      const info = await client.getProtocolInfo();
      setIsAvailable(info.gasSponsorship.enabled);
      setFacilitatorAddress(info.gasSponsorship.facilitatorAddress || null);
    } catch {
      setIsAvailable(false);
      setFacilitatorAddress(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    isAvailable,
    facilitatorAddress,
    loading,
    checkStatus,
  };
}
