"use client";

import { useCallback } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { api } from "@/lib/api";

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

    return api.initiatePayment({ tabId, payerAddress: address });
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
    try {
      const result = await api.submitPayment({
        paymentId,
        signature,
        deadline: parseInt(deadline),
      });

      return {
        success: true,
        txHash: result.txHash,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Payment failed",
      };
    }
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
