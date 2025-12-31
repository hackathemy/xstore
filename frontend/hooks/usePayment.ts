"use client";

import { useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { AccountAddress, InputGenerateTransactionPayloadData } from "@aptos-labs/ts-sdk";
import { api } from "@/lib/api";
import { USE_TEST_WALLET } from "@/context";
import { useTestWallet } from "@/context/TestWalletContext";
import {
  parseMoveAmount,
  parseStablecoinAmount,
  getActiveNetwork,
  getPaymentStablecoin,
  getStablecoinType,
  MOVE_COIN_TYPE,
} from "@/lib/movement";

// Payment module address (deployed on Movement)
const PAYMENT_MODULE_ADDRESS = process.env.NEXT_PUBLIC_PAYMENT_MODULE_ADDRESS ||
  "0x1"; // Default to framework address

// Use stablecoin for payments by default
const USE_STABLECOIN = process.env.NEXT_PUBLIC_USE_STABLECOIN !== "false";

interface PaymentData {
  paymentId: string;
  amount: string;
  amountFormatted?: string;
  recipient: string;
  moduleAddress: string;
  network: string;
  coinType?: string; // Coin type for payment (USDC, USDT, MOVE, etc.)
}

interface PaymentResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export function usePayment() {
  const { user } = usePrivy();
  const testWallet = USE_TEST_WALLET ? useTestWallet() : null;

  // Use test wallet address if available, otherwise use Privy wallet
  const address = USE_TEST_WALLET ? testWallet?.address : user?.wallet?.address;

  // Get the stablecoin config for payments
  const stablecoin = getPaymentStablecoin();

  // Step 1: Initiate payment - get payment details from backend
  const initiatePayment = useCallback(async (tabId: string): Promise<PaymentData> => {
    if (!address) {
      throw new Error("Wallet not connected");
    }

    const data = await api.initiatePayment({ tabId, payerAddress: address });

    // Add coin type for stablecoin payments
    return {
      ...data,
      coinType: USE_STABLECOIN ? stablecoin.coinType : MOVE_COIN_TYPE,
    };
  }, [address, stablecoin.coinType]);

  // Step 2: Execute payment transaction on Movement
  const executePayment = useCallback(async (paymentData: PaymentData): Promise<string> => {
    if (!address) {
      throw new Error("Wallet not connected");
    }

    // Use test wallet for transaction
    if (USE_TEST_WALLET && testWallet) {
      const coinType = paymentData.coinType || stablecoin.coinType;
      const isStablecoin = coinType !== MOVE_COIN_TYPE;

      if (isStablecoin) {
        // Stablecoin payment (USDC, USDT, etc.)
        console.log("💵 Executing stablecoin payment:", {
          coinType,
          amount: paymentData.amount,
          recipient: paymentData.recipient,
        });

        // Use coin::transfer with type argument for stablecoins
        const amountInSmallestUnit = parseStablecoinAmount(
          parseFloat(paymentData.amount),
          stablecoin.decimals
        );

        const payload: InputGenerateTransactionPayloadData = {
          function: "0x1::coin::transfer",
          typeArguments: [coinType],
          functionArguments: [
            AccountAddress.from(paymentData.recipient),
            amountInSmallestUnit,
          ],
        };

        const txHash = await testWallet.signAndSubmitTransaction(payload);
        return txHash;
      } else {
        // Native MOVE payment
        const amountInOctas = parseMoveAmount(parseFloat(paymentData.amount));

        const payload: InputGenerateTransactionPayloadData = {
          function: "0x1::aptos_account::transfer",
          functionArguments: [
            AccountAddress.from(paymentData.recipient),
            amountInOctas,
          ],
        };

        const txHash = await testWallet.signAndSubmitTransaction(payload);
        return txHash;
      }
    }

    // For Privy wallet - not yet implemented
    throw new Error("Privy Movement wallet integration not yet implemented. Use test wallet mode.");
  }, [address, testWallet, stablecoin]);

  // Step 3: Submit payment confirmation to backend
  const confirmPayment = useCallback(async (
    paymentId: string,
    txHash: string,
  ): Promise<PaymentResult> => {
    try {
      const result = await api.submitPayment({
        paymentId,
        signature: txHash, // In Move, we send txHash instead of signature
        deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour validity
      });

      return {
        success: true,
        txHash: result.txHash || txHash,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Payment confirmation failed",
      };
    }
  }, []);

  // Complete payment flow
  const payTab = useCallback(async (tabId: string): Promise<PaymentResult> => {
    try {
      // Step 1: Initiate and get payment data
      const paymentData = await initiatePayment(tabId);
      console.log("📋 Payment initiated:", paymentData);

      // Step 2: Execute Move transaction
      const txHash = await executePayment(paymentData);
      console.log("✅ Transaction submitted:", txHash);

      // Step 3: Confirm payment with backend
      const result = await confirmPayment(paymentData.paymentId, txHash);

      return result;
    } catch (error) {
      console.error("Payment error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Payment failed",
      };
    }
  }, [initiatePayment, executePayment, confirmPayment]);

  // Direct stablecoin transfer (without backend involvement)
  const directStablecoinTransfer = useCallback(async (
    to: string,
    amount: number,
    coinType?: string,
  ): Promise<PaymentResult> => {
    if (!address) {
      return { success: false, error: "Wallet not connected" };
    }

    try {
      if (USE_TEST_WALLET && testWallet) {
        const txHash = await testWallet.transferStablecoin(to, amount, coinType);
        return { success: true, txHash };
      }

      return { success: false, error: "Privy Movement not implemented" };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Transfer failed",
      };
    }
  }, [address, testWallet]);

  // Direct MOVE transfer (without backend involvement)
  const directTransfer = useCallback(async (
    to: string,
    amount: number,
  ): Promise<PaymentResult> => {
    if (!address) {
      return { success: false, error: "Wallet not connected" };
    }

    try {
      if (USE_TEST_WALLET && testWallet) {
        const txHash = await testWallet.transferCoin(to, amount);
        return { success: true, txHash };
      }

      return { success: false, error: "Privy Movement not implemented" };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Transfer failed",
      };
    }
  }, [address, testWallet]);

  return {
    payTab,
    directTransfer,
    directStablecoinTransfer,
    initiatePayment,
    executePayment,
    confirmPayment,
    isConnected: !!address,
    network: getActiveNetwork(),
    stablecoin, // Expose current stablecoin config
    useStablecoin: USE_STABLECOIN,
  };
}
