"use client";

import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from "react";
import {
  Aptos,
  AptosConfig,
  Account,
  Ed25519PrivateKey,
  AccountAddress,
  InputGenerateTransactionPayloadData,
  SimpleTransaction,
} from "@aptos-labs/ts-sdk";
import {
  getActiveNetwork,
  formatMoveAddress,
  parseMoveAmount,
  formatMoveAmount,
  MOVE_COIN_TYPE,
  MOVE_DECIMALS,
} from "@/lib/movement";

// Test private key (Ed25519) - Generate a new one for testing
// You can generate with: aptos key generate --output-file test_key
const TEST_PRIVATE_KEY = process.env.NEXT_PUBLIC_TEST_PRIVATE_KEY ||
  "0x1111111111111111111111111111111111111111111111111111111111111111";

interface TestWalletContextType {
  address: string | null;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  getBalance: () => Promise<string>;
  signAndSubmitTransaction: (payload: InputGenerateTransactionPayloadData) => Promise<string>;
  signMessage: (message: string) => Promise<string>;
  transferCoin: (to: string, amount: number) => Promise<string>;
  getClient: () => Aptos;
  getAccount: () => Account;
}

const TestWalletContext = createContext<TestWalletContextType | null>(null);

export function TestWalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [client] = useState(() => {
    const network = getActiveNetwork();
    const config = new AptosConfig({
      fullnode: network.nodeUrl,
      faucet: network.faucetUrl,
    });
    return new Aptos(config);
  });

  const [account] = useState(() => {
    try {
      const privateKey = new Ed25519PrivateKey(TEST_PRIVATE_KEY);
      return Account.fromPrivateKey({ privateKey });
    } catch (error) {
      console.error("Failed to create account from private key:", error);
      // Generate a new account for testing if private key is invalid
      return Account.generate();
    }
  });

  const connect = useCallback(async () => {
    const addr = account.accountAddress.toString();
    setAddress(addr);
    console.log("🔗 Move test wallet connected:", addr);
  }, [account]);

  const disconnect = useCallback(() => {
    setAddress(null);
    console.log("🔌 Move test wallet disconnected");
  }, []);

  const getBalance = useCallback(async (): Promise<string> => {
    if (!address) return "0";

    try {
      const resources = await client.getAccountResources({
        accountAddress: AccountAddress.from(address),
      });

      const coinStore = resources.find(
        (r) => r.type === `0x1::coin::CoinStore<${MOVE_COIN_TYPE}>`
      );

      if (coinStore) {
        const balance = (coinStore.data as { coin: { value: string } }).coin.value;
        return formatMoveAmount(BigInt(balance));
      }
      return "0";
    } catch (error) {
      console.error("Error fetching balance:", error);
      return "0";
    }
  }, [address, client]);

  const signAndSubmitTransaction = useCallback(async (
    payload: InputGenerateTransactionPayloadData
  ): Promise<string> => {
    if (!address) throw new Error("Wallet not connected");

    try {
      // Build transaction
      const transaction = await client.transaction.build.simple({
        sender: account.accountAddress,
        data: payload,
      });

      // Sign transaction
      const senderAuthenticator = client.transaction.sign({
        signer: account,
        transaction,
      });

      // Submit transaction
      const pendingTx = await client.transaction.submit.simple({
        transaction,
        senderAuthenticator,
      });

      // Wait for confirmation
      const txResult = await client.waitForTransaction({
        transactionHash: pendingTx.hash,
      });

      console.log("✅ Transaction confirmed:", txResult.hash);
      return txResult.hash;
    } catch (error) {
      console.error("Transaction failed:", error);
      throw error;
    }
  }, [address, account, client]);

  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!address) throw new Error("Wallet not connected");

    const encoder = new TextEncoder();
    const messageBytes = encoder.encode(message);
    const signature = account.sign(messageBytes);

    return signature.toString();
  }, [address, account]);

  const transferCoin = useCallback(async (to: string, amount: number): Promise<string> => {
    if (!address) throw new Error("Wallet not connected");

    const amountInOctas = parseMoveAmount(amount);

    const payload: InputGenerateTransactionPayloadData = {
      function: "0x1::aptos_account::transfer",
      functionArguments: [AccountAddress.from(to), amountInOctas],
    };

    return signAndSubmitTransaction(payload);
  }, [address, signAndSubmitTransaction]);

  const getClient = useCallback(() => client, [client]);
  const getAccount = useCallback(() => account, [account]);

  // Auto-connect on mount for testing
  useEffect(() => {
    connect();
  }, [connect]);

  return (
    <TestWalletContext.Provider
      value={{
        address,
        isConnected: !!address,
        connect,
        disconnect,
        getBalance,
        signAndSubmitTransaction,
        signMessage,
        transferCoin,
        getClient,
        getAccount,
      }}
    >
      {children}
    </TestWalletContext.Provider>
  );
}

export function useTestWallet() {
  const context = useContext(TestWalletContext);
  if (!context) {
    throw new Error("useTestWallet must be used within TestWalletProvider");
  }
  return context;
}
