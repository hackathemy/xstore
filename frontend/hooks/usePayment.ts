"use client";

import { useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { AccountAddress, InputGenerateTransactionPayloadData } from "@aptos-labs/ts-sdk";
import { api } from "@/lib/api";
import { USE_TEST_WALLET } from "@/context";
import { useTestWallet } from "@/context/TestWalletContext";
import { usePrivyWallet } from "@/context/PrivyWalletContext";
import {
  parseMoveAmount,
  parseStablecoinAmount,
  getActiveNetwork,
  getPaymentStablecoin,
  MOVE_COIN_TYPE,
} from "@/lib/movement";

// Use stablecoin for payments by default
const USE_STABLECOIN = process.env.NEXT_PUBLIC_USE_STABLECOIN !== "false";

interface PaymentResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export function usePayment() {
  const { user } = usePrivy();

  // Use test wallet if enabled, otherwise use Privy wallet
  const testWallet = USE_TEST_WALLET ? useTestWallet() : null;
  const privyWallet = !USE_TEST_WALLET ? usePrivyWallet() : null;

  // Get address from appropriate wallet
  const address = USE_TEST_WALLET
    ? testWallet?.address
    : (privyWallet?.address || user?.wallet?.address);

  // Get the stablecoin config for payments
  const stablecoin = getPaymentStablecoin();

  /**
   * Pay a tab - FE에서 직접 트랜잭션 빌드, 서명, 제출
   * 백엔드 build-sponsored API 호출 없이 처리
   */
  const payTab = useCallback(async (tabId: string): Promise<PaymentResult> => {
    if (!address) {
      return { success: false, error: "Wallet not connected" };
    }

    try {
      // Use test wallet for direct payment
      if (USE_TEST_WALLET && testWallet) {
        // Step 1: Initiate and get payment data
        const paymentData = await api.initiatePayment({ tabId, payerAddress: address });
        console.log("📋 Payment initiated:", paymentData);

        const coinType = USE_STABLECOIN ? stablecoin.coinType : MOVE_COIN_TYPE;
        const isStablecoin = coinType !== MOVE_COIN_TYPE;

        // Step 2: Execute Move transaction
        let txHash: string;
        if (isStablecoin) {
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

          txHash = await testWallet.signAndSubmitTransaction(payload);
        } else {
          const amountInOctas = parseMoveAmount(parseFloat(paymentData.amount));

          const payload: InputGenerateTransactionPayloadData = {
            function: "0x1::aptos_account::transfer",
            functionArguments: [
              AccountAddress.from(paymentData.recipient),
              amountInOctas,
            ],
          };

          txHash = await testWallet.signAndSubmitTransaction(payload);
        }

        console.log("✅ Transaction submitted:", txHash);

        // Step 3: Confirm payment with backend
        const result = await api.submitPayment({
          paymentId: paymentData.paymentId,
          signature: txHash,
          deadline: Math.floor(Date.now() / 1000) + 3600,
        });

        return {
          success: true,
          txHash: result.txHash || txHash,
        };
      }

      // Use Privy wallet - FE에서 직접 트랜잭션 빌드/서명/제출
      if (!USE_TEST_WALLET && privyWallet) {
        console.log("🔐 Using Privy wallet - FE direct transaction...");
        return await privyWallet.payTab(tabId);
      }

      return { success: false, error: "No wallet available" };
    } catch (error) {
      console.error("Payment error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Payment failed",
      };
    }
  }, [address, testWallet, privyWallet, stablecoin]);

  // Direct stablecoin transfer (test wallet only)
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

      // Privy wallet도 직접 전송 지원
      if (!USE_TEST_WALLET && privyWallet) {
        const targetCoinType = coinType || stablecoin.coinType;
        const amountInSmallestUnit = parseStablecoinAmount(amount, stablecoin.decimals);

        const payload: InputGenerateTransactionPayloadData = {
          function: "0x1::coin::transfer",
          typeArguments: [targetCoinType],
          functionArguments: [
            AccountAddress.from(to),
            amountInSmallestUnit,
          ],
        };

        const txHash = await privyWallet.signAndSubmitTransaction(payload);
        return { success: true, txHash };
      }

      return { success: false, error: "No wallet available" };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Transfer failed",
      };
    }
  }, [address, testWallet, privyWallet, stablecoin]);

  // Direct MOVE transfer
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

      // Privy wallet도 직접 전송 지원
      if (!USE_TEST_WALLET && privyWallet) {
        const amountInOctas = parseMoveAmount(amount);

        const payload: InputGenerateTransactionPayloadData = {
          function: "0x1::aptos_account::transfer",
          functionArguments: [
            AccountAddress.from(to),
            amountInOctas,
          ],
        };

        const txHash = await privyWallet.signAndSubmitTransaction(payload);
        return { success: true, txHash };
      }

      return { success: false, error: "No wallet available" };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Transfer failed",
      };
    }
  }, [address, testWallet, privyWallet]);

  return {
    payTab,
    directTransfer,
    directStablecoinTransfer,
    isConnected: !!address,
    network: getActiveNetwork(),
    stablecoin,
    useStablecoin: USE_STABLECOIN,
  };
}
