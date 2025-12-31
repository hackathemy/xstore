"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useCallback, useMemo, useState, useEffect } from "react";
import {
  Aptos,
  AptosConfig,
  AccountAddress,
  InputGenerateTransactionPayloadData,
} from "@aptos-labs/ts-sdk";
import {
  getActiveNetwork,
  createMovementClient,
  formatMoveAmount,
  parseMoveAmount,
  MOVE_COIN_TYPE,
  shortenMoveAddress,
} from "@/lib/movement";
import { USE_TEST_WALLET } from "@/context";
import { useTestWallet } from "@/context/TestWalletContext";

// Movement Network (Move Native)
const activeNetwork = getActiveNetwork();

export function useWallet() {
  const { ready, authenticated, user } = usePrivy();
  const testWallet = USE_TEST_WALLET ? useTestWallet() : null;

  // Movement client
  const client = useMemo(() => createMovementClient(), []);

  // Use test wallet address if enabled, otherwise use Privy wallet
  // Note: Privy Movement addresses are different from EVM addresses
  const address = USE_TEST_WALLET
    ? testWallet?.address
    : user?.wallet?.address; // Privy will provide Movement address when configured

  const isConnected = USE_TEST_WALLET
    ? (testWallet?.isConnected ?? false)
    : (authenticated && !!user?.wallet?.address);

  const getBalance = useCallback(async () => {
    if (!address) return null;

    try {
      // Use test wallet's getBalance for test mode
      if (USE_TEST_WALLET && testWallet) {
        const balance = await testWallet.getBalance();
        return {
          value: parseMoveAmount(parseFloat(balance)),
          formatted: balance,
          decimals: 8,
          symbol: 'MOVE',
        };
      }

      // For Privy wallet - query Movement network
      const resources = await client.getAccountResources({
        accountAddress: AccountAddress.from(address),
      });

      const coinStore = resources.find(
        (r) => r.type === `0x1::coin::CoinStore<${MOVE_COIN_TYPE}>`
      );

      if (coinStore) {
        const balance = BigInt((coinStore.data as { coin: { value: string } }).coin.value);
        return {
          value: balance,
          formatted: formatMoveAmount(balance),
          decimals: 8,
          symbol: 'MOVE',
        };
      }

      return {
        value: BigInt(0),
        formatted: '0',
        decimals: 8,
        symbol: 'MOVE',
      };
    } catch (error) {
      console.error("Error fetching balance:", error);
      return null;
    }
  }, [address, testWallet, client]);

  const sendMOVE = useCallback(
    async (to: string, amount: number) => {
      // Use test wallet for sending
      if (USE_TEST_WALLET && testWallet) {
        if (!testWallet.isConnected || !testWallet.address) {
          throw new Error("Test wallet not connected");
        }

        try {
          const txHash = await testWallet.transferCoin(to, amount);
          console.log("🧪 Test wallet TX sent:", txHash);
          return txHash;
        } catch (error) {
          console.error("Error sending MOVE (test wallet):", error);
          throw error;
        }
      }

      // For Privy wallet - need to implement Movement transaction signing
      // This requires Privy's Movement integration
      throw new Error("Privy Movement wallet integration not yet implemented. Use test wallet mode.");
    },
    [testWallet]
  );

  // Sign and submit a Move transaction
  const signAndSubmitTransaction = useCallback(
    async (payload: InputGenerateTransactionPayloadData) => {
      if (USE_TEST_WALLET && testWallet) {
        return testWallet.signAndSubmitTransaction(payload);
      }

      // For Privy wallet - need to implement
      throw new Error("Privy Movement wallet integration not yet implemented. Use test wallet mode.");
    },
    [testWallet]
  );

  // Sign a message
  const signMessage = useCallback(
    async (message: string) => {
      if (USE_TEST_WALLET && testWallet) {
        return testWallet.signMessage(message);
      }

      throw new Error("Privy Movement wallet integration not yet implemented. Use test wallet mode.");
    },
    [testWallet]
  );

  return {
    ready: USE_TEST_WALLET ? true : ready,
    isConnected,
    address,
    getBalance,
    sendMOVE,
    signAndSubmitTransaction,
    signMessage,
    client,
    network: activeNetwork,
  };
}
