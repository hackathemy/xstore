"use client";

import { useCallback } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

interface PaymentData {
  paymentId: string;
  amount: string;
  tokenAddress: string;
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  };
  types: {
    Permit: Array<{ name: string; type: string }>;
  };
  message: {
    owner: string;
    spender: string;
    value: string;
    nonce: string;
    deadline: string;
  };
}

interface PaymentResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export function usePayment() {
  const { user } = usePrivy();
  const { wallets } = useWallets();

  const address = user?.wallet?.address;
  const wallet = wallets.find((w) => w.address === address);

  // Step 1: Initiate payment - get EIP-712 typed data from backend
  const initiatePayment = useCallback(async (tabId: string): Promise<PaymentData> => {
    if (!address) {
      throw new Error("Wallet not connected");
    }

    const response = await fetch(`${BACKEND_URL}/api/payments/initiate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tabId,
        payerAddress: address,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to initiate payment");
    }

    return response.json();
  }, [address]);

  // Step 2: Sign permit using EIP-712
  const signPermit = useCallback(async (paymentData: PaymentData): Promise<string> => {
    if (!wallet || !address) {
      throw new Error("Wallet not connected");
    }

    const provider = await wallet.getEthereumProvider();

    // Construct EIP-712 typed data
    const typedData = {
      types: {
        EIP712Domain: [
          { name: "name", type: "string" },
          { name: "version", type: "string" },
          { name: "chainId", type: "uint256" },
          { name: "verifyingContract", type: "address" },
        ],
        ...paymentData.types,
      },
      primaryType: "Permit",
      domain: paymentData.domain,
      message: paymentData.message,
    };

    // Sign using eth_signTypedData_v4
    const signature = await provider.request({
      method: "eth_signTypedData_v4",
      params: [address, JSON.stringify(typedData)],
    });

    return signature as string;
  }, [wallet, address]);

  // Step 3: Submit signed permit to backend
  const submitPayment = useCallback(async (
    paymentId: string,
    signature: string,
    deadline: string
  ): Promise<PaymentResult> => {
    // Parse signature into v, r, s
    const sig = signature.slice(2);
    const r = "0x" + sig.slice(0, 64);
    const s = "0x" + sig.slice(64, 128);
    const v = parseInt(sig.slice(128, 130), 16);

    const response = await fetch(`${BACKEND_URL}/api/payments/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentId,
        signature,
        deadline,
        v,
        r,
        s,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.message || "Payment failed",
      };
    }

    const result = await response.json();
    return {
      success: true,
      txHash: result.txHash,
    };
  }, []);

  // Complete payment flow
  const payTab = useCallback(async (tabId: string): Promise<PaymentResult> => {
    try {
      // Step 1: Initiate and get permit data
      const paymentData = await initiatePayment(tabId);

      // Step 2: Sign permit
      const signature = await signPermit(paymentData);

      // Step 3: Submit payment
      const result = await submitPayment(
        paymentData.paymentId,
        signature,
        paymentData.message.deadline
      );

      return result;
    } catch (error) {
      console.error("Payment error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Payment failed",
      };
    }
  }, [initiatePayment, signPermit, submitPayment]);

  return {
    payTab,
    initiatePayment,
    signPermit,
    submitPayment,
    isConnected: !!address,
  };
}
