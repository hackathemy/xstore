"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useCallback, useMemo } from "react";
import {
  AccountAddress,
  InputGenerateTransactionPayloadData,
} from "@aptos-labs/ts-sdk";
import {
  getActiveNetwork,
  createMovementClient,
  formatMoveAmount,
  parseMoveAmount,
  MOVE_COIN_TYPE,
} from "@/lib/movement";
import { USE_TEST_WALLET } from "@/context";
import { useTestWallet } from "@/context/TestWalletContext";
import { usePrivyWallet } from "@/context/PrivyWalletContext";

// Movement Network (Move Native)
const activeNetwork = getActiveNetwork();

export function useWallet() {
  const { ready, authenticated } = usePrivy();
  const testWallet = USE_TEST_WALLET ? useTestWallet() : null;
  const privyWallet = !USE_TEST_WALLET ? usePrivyWallet() : null;

  // Movement client
  const client = useMemo(() => createMovementClient(), []);

  // Use test wallet address if enabled, otherwise use Privy wallet (now with local Ed25519 key)
  const address = USE_TEST_WALLET
    ? testWallet?.address
    : privyWallet?.address;

  const isConnected = USE_TEST_WALLET
    ? (testWallet?.isConnected ?? false)
    : (privyWallet?.isConnected ?? false);

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

      // For Privy wallet - use PrivyWalletContext (with local Ed25519 key)
      if (privyWallet) {
        const balance = await privyWallet.getBalance();
        return {
          value: parseMoveAmount(parseFloat(balance)),
          formatted: balance,
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
  }, [address, testWallet, privyWallet]);

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

      // For Privy wallet with local Ed25519 key - direct transfers not supported
      // Use X402 sponsorship via payTab
      throw new Error("Direct transfers not supported. Use payTab with X402 gas sponsorship.");
    },
    [testWallet]
  );

  // Sign and submit a Move transaction
  const signAndSubmitTransaction = useCallback(
    async (payload: InputGenerateTransactionPayloadData) => {
      if (USE_TEST_WALLET && testWallet) {
        return testWallet.signAndSubmitTransaction(payload);
      }

      // For Privy wallet - use local Ed25519 account if available
      if (privyWallet) {
        const account = privyWallet.getAccount();
        if (!account) {
          throw new Error("Account not initialized");
        }

        // Build and sign transaction
        const transaction = await client.transaction.build.simple({
          sender: account.accountAddress,
          data: payload,
        });

        const senderAuthenticator = client.transaction.sign({
          signer: account,
          transaction,
        });

        const pendingTx = await client.transaction.submit.simple({
          transaction,
          senderAuthenticator,
        });

        const txResult = await client.waitForTransaction({
          transactionHash: pendingTx.hash,
        });

        console.log("✅ Transaction confirmed:", txResult.hash);
        return txResult.hash;
      }

      throw new Error("Wallet not connected");
    },
    [testWallet, privyWallet, client]
  );

  // Sign a message
  const signMessage = useCallback(
    async (message: string) => {
      if (USE_TEST_WALLET && testWallet) {
        return testWallet.signMessage(message);
      }

      // For Privy wallet - use PrivyWalletContext
      if (privyWallet) {
        return privyWallet.signMessage(message);
      }

      throw new Error("Wallet not connected");
    },
    [testWallet, privyWallet]
  );

  // Get the underlying account (for advanced operations)
  const getAccount = useCallback(() => {
    if (USE_TEST_WALLET && testWallet) {
      return testWallet.getAccount();
    }
    if (privyWallet) {
      return privyWallet.getAccount();
    }
    return null;
  }, [testWallet, privyWallet]);

  // Export private key (for backup)
  const exportPrivateKey = useCallback(() => {
    if (privyWallet) {
      return privyWallet.exportPrivateKey();
    }
    return null;
  }, [privyWallet]);

  return {
    ready: USE_TEST_WALLET ? true : ready,
    isConnected,
    address,
    getBalance,
    sendMOVE,
    signAndSubmitTransaction,
    signMessage,
    getAccount,
    exportPrivateKey,
    client,
    network: activeNetwork,
  };
}
