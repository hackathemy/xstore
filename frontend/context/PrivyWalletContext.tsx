"use client";

import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";

import {
  Aptos,
  AptosConfig,
  Account,
  Ed25519PrivateKey,
  AccountAddress,
  Network,
  Hex,
  InputGenerateTransactionPayloadData,
  Deserializer,
  SimpleTransaction,
} from "@aptos-labs/ts-sdk";
import {
  getActiveNetwork,
  formatMoveAmount,
  formatStablecoinAmount,
  MOVE_COIN_TYPE,
  getPaymentStablecoin,
} from "@/lib/movement";
import { api } from "@/lib/api";

// Local storage key for the generated wallet
const WALLET_STORAGE_KEY = "xstore_movement_wallet";
// Deterministic message for wallet derivation from Privy signature
const WALLET_DERIVATION_MESSAGE = "XStore Movement Wallet Derivation v1";

interface StoredWallet {
  privateKey: string;
  address: string;
  derivedFromPrivy?: boolean; // Flag to indicate if derived from Privy signature
}

interface PrivyWalletContextType {
  address: string | null;
  isConnected: boolean;
  isLoading: boolean;
  isDerivingWallet: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  getBalance: () => Promise<string>;
  getStablecoinBalance: (coinType?: string) => Promise<string>;
  signMessage: (message: string) => Promise<string>;
  signAndSubmitTransaction: (payload: InputGenerateTransactionPayloadData) => Promise<string>;
  payTab: (tabId: string) => Promise<{ success: boolean; txHash?: string; error?: string }>;
  getClient: () => Aptos | null;
  getAccount: () => Account | null;
  exportPrivateKey: () => string | null;
  registerForTusdc: () => Promise<{ success: boolean; txHash?: string; error?: string }>;
  isRegisteredForTusdc: () => Promise<boolean>;
}

const PrivyWalletContext = createContext<PrivyWalletContextType | null>(null);

/**
 * Load existing wallet from localStorage (if any)
 */
function loadStoredWallet(userId: string): Account | null {
  const storageKey = `${WALLET_STORAGE_KEY}_${userId}`;

  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const walletData: StoredWallet = JSON.parse(stored);
        const privateKey = new Ed25519PrivateKey(walletData.privateKey);
        const account = Account.fromPrivateKey({ privateKey });
        console.log("🔑 Loaded existing Movement wallet:", account.accountAddress.toString());
        console.log("   Derived from Privy:", walletData.derivedFromPrivy || false);
        return account;
      } catch (error) {
        console.error("Failed to load wallet:", error);
      }
    }
  }
  return null;
}

/**
 * Derive Ed25519 wallet from Privy user ID and embedded wallet address
 * No signing required - uses deterministic derivation from user identity
 * Same Privy user always gets same Movement address
 */
function deriveWalletFromPrivyIdentity(
  userId: string,
  embeddedWalletAddress: string
): Account {
  const storageKey = `${WALLET_STORAGE_KEY}_${userId}`;

  console.log("🔐 Deriving Movement wallet from Privy identity (no signing required)...");

  // Create deterministic seed from user ID + embedded wallet address + derivation message
  const identityString = `${userId}:${embeddedWalletAddress}:${WALLET_DERIVATION_MESSAGE}`;
  const identityBytes = new TextEncoder().encode(identityString);
  const seed = sha256(identityBytes);
  const seedHex = "0x" + bytesToHex(seed);

  // Create Ed25519 private key from the seed
  const privateKey = new Ed25519PrivateKey(seedHex);
  const account = Account.fromPrivateKey({ privateKey });

  console.log("🔑 Derived Movement wallet:", account.accountAddress.toString());

  // Store the derived wallet
  if (typeof window !== 'undefined') {
    const walletData: StoredWallet = {
      privateKey: seedHex,
      address: account.accountAddress.toString(),
      derivedFromPrivy: true,
    };
    localStorage.setItem(storageKey, JSON.stringify(walletData));
    console.log("💾 Saved derived wallet to localStorage");
  }

  return account;
}

export function PrivyWalletProvider({ children }: { children: ReactNode }) {
  const { login, logout, authenticated, user, ready } = usePrivy();
  const { wallets } = useWallets();
  const [isLoading, setIsLoading] = useState(false);
  const [isDerivingWallet, setIsDerivingWallet] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // Initialize Aptos client for balance queries
  // Use useMemo with browser-only initialization to ensure proxy URLs work correctly
  const [client, setClient] = useState<Aptos | null>(null);

  // Create client on mount (browser only) to use proxy URLs
  useEffect(() => {
    const networkConfig = getActiveNetwork();
    const config = new AptosConfig({
      network: Network.CUSTOM,
      fullnode: networkConfig.nodeUrl,
      faucet: networkConfig.faucetUrl,
    });
    setClient(new Aptos(config));
    console.log("🔧 Aptos client initialized with URL:", networkConfig.nodeUrl);
  }, []);

  const stablecoin = getPaymentStablecoin();

  // Initialize wallet when user is authenticated
  // First try to load existing wallet, if not found, derive from Privy signature
  useEffect(() => {
    if (!authenticated || !user?.id) {
      setAccount(null);
      setWalletAddress(null);
      return;
    }

    // Try to load existing wallet first
    const existingAccount = loadStoredWallet(user.id);
    if (existingAccount) {
      setAccount(existingAccount);
      setWalletAddress(existingAccount.accountAddress.toString());
      return;
    }

    // No existing wallet - need to derive from Privy identity
    // Find the embedded wallet from Privy
    const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy');

    if (!embeddedWallet) {
      console.log("⏳ Waiting for Privy embedded wallet...");
      return; // Will retry when wallets change
    }

    // Derive wallet from Privy identity (no signing required - no modal!)
    setIsDerivingWallet(true);
    try {
      console.log("🔐 Found Privy embedded wallet:", embeddedWallet.address);

      // Derive wallet deterministically from user ID + embedded wallet address
      // This is synchronous and does not require user interaction
      const derivedAccount = deriveWalletFromPrivyIdentity(user.id, embeddedWallet.address);
      setAccount(derivedAccount);
      setWalletAddress(derivedAccount.accountAddress.toString());
    } catch (error) {
      console.error("Failed to derive wallet from Privy:", error);
      // Fallback: generate random wallet (shouldn't normally happen)
      console.log("⚠️ Falling back to random wallet generation");
      const fallbackAccount = Account.generate();
      const storageKey = `${WALLET_STORAGE_KEY}_${user.id}`;
      if (typeof window !== 'undefined') {
        const walletData: StoredWallet = {
          privateKey: fallbackAccount.privateKey.toString(),
          address: fallbackAccount.accountAddress.toString(),
          derivedFromPrivy: false,
        };
        localStorage.setItem(storageKey, JSON.stringify(walletData));
      }
      setAccount(fallbackAccount);
      setWalletAddress(fallbackAccount.accountAddress.toString());
    } finally {
      setIsDerivingWallet(false);
    }
  }, [authenticated, user?.id, wallets]);

  const connect = useCallback(async () => {
    if (!authenticated) {
      setIsLoading(true);
      try {
        await login();
      } finally {
        setIsLoading(false);
      }
    }
  }, [authenticated, login]);

  const disconnect = useCallback(async () => {
    await logout();
    setAccount(null);
    setWalletAddress(null);
  }, [logout]);

  const getBalance = useCallback(async (): Promise<string> => {
    if (!walletAddress || !client) return "0";

    try {
      const resources = await client.getAccountResources({
        accountAddress: AccountAddress.from(walletAddress),
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
  }, [walletAddress, client]);

  const getStablecoinBalance = useCallback(async (coinType?: string): Promise<string> => {
    if (!walletAddress || !client) return "0";

    const targetCoinType = coinType || stablecoin.coinType;

    try {
      const resources = await client.getAccountResources({
        accountAddress: AccountAddress.from(walletAddress),
      });

      const coinStore = resources.find(
        (r) => r.type === `0x1::coin::CoinStore<${targetCoinType}>`
      );

      if (coinStore) {
        const balance = (coinStore.data as { coin: { value: string } }).coin.value;
        return formatStablecoinAmount(BigInt(balance), stablecoin.decimals);
      }
      return "0";
    } catch (error) {
      console.error("Error fetching stablecoin balance:", error);
      return "0";
    }
  }, [walletAddress, client, stablecoin]);

  /**
   * Sign a message using the local Ed25519 key
   */
  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!account) throw new Error("Wallet not connected");

    const encoder = new TextEncoder();
    const messageBytes = encoder.encode(message);
    const signature = account.sign(messageBytes);

    return signature.toString();
  }, [account]);

  /**
   * Sign and submit a transaction using the local Ed25519 key
   * FE에서 직접 트랜잭션 빌드 및 서명
   */
  const signAndSubmitTransaction = useCallback(async (
    payload: InputGenerateTransactionPayloadData
  ): Promise<string> => {
    if (!account) throw new Error("Wallet not connected");
    if (!client) throw new Error("Client not initialized");

    console.log("🔧 Building transaction in FE...");

    // Build transaction
    const transaction = await client.transaction.build.simple({
      sender: account.accountAddress,
      data: payload,
    });

    console.log("✍️ Signing transaction with local Ed25519 key...");

    // Sign transaction
    const senderAuthenticator = client.transaction.sign({
      signer: account,
      transaction,
    });

    console.log("📤 Submitting transaction...");

    // Submit transaction
    const pendingTx = await client.transaction.submit.simple({
      transaction,
      senderAuthenticator,
    });

    console.log("⏳ Waiting for confirmation...");

    // Wait for confirmation
    const txResult = await client.waitForTransaction({
      transactionHash: pendingTx.hash,
    });

    console.log("✅ Transaction confirmed:", txResult.hash);
    return txResult.hash;
  }, [account, client]);

  /**
   * Pay a tab - X402 Fee Payer 방식
   * Facilitator가 가스비 대납, 사용자는 MOVE 토큰 불필요
   */
  const payTab = useCallback(async (
    tabId: string
  ): Promise<{ success: boolean; txHash?: string; error?: string }> => {
    if (!walletAddress) {
      return { success: false, error: "Wallet not connected" };
    }
    if (!account) {
      return { success: false, error: "Account not initialized" };
    }
    if (!client) {
      return { success: false, error: "Client not initialized" };
    }

    try {
      setIsLoading(true);

      // Step 1: Close tab if needed
      console.log("📋 Checking tab status...");
      let tab = await api.getTab(tabId);

      if (tab && tab.status === 'OPEN') {
        console.log("📝 Closing tab to mark as ready for payment...");
        await api.closeTab(tabId);
      }

      // Step 2: Build sponsored transaction via backend (Facilitator pays gas)
      console.log("🔧 Building sponsored transaction...");
      const sponsoredTx = await api.buildSponsoredTransaction({
        tabId,
        payerAddress: walletAddress,
      });

      console.log("💵 Payment info:", {
        amount: sponsoredTx.payment.amountFormatted,
        currency: sponsoredTx.payment.currency,
        recipient: sponsoredTx.payment.recipient,
        feePayerAddress: sponsoredTx.feePayerAddress,
      });

      // Step 3: Deserialize and sign the transaction as sender only
      console.log("✍️ Signing transaction (sender only, gas paid by Facilitator)...");
      const txBytes = new Uint8Array(Buffer.from(sponsoredTx.transactionBytes, 'hex'));
      const transaction = SimpleTransaction.deserialize(new Deserializer(txBytes));

      const senderAuthenticator = client.transaction.sign({
        signer: account,
        transaction,
      });

      // Serialize the authenticator
      const senderAuthenticatorBytes = Buffer.from(senderAuthenticator.bcsToBytes()).toString('hex');

      // Step 4: Submit to backend - Facilitator co-signs as fee payer and broadcasts
      console.log("📤 Submitting to Facilitator for gas sponsorship...");
      const result = await api.submitSponsoredTransaction({
        paymentId: sponsoredTx.paymentId,
        transactionBytes: sponsoredTx.transactionBytes,
        senderAuthenticatorBytes,
      });

      if (result.valid && result.txHash) {
        console.log("✅ Transaction confirmed:", result.txHash);
        return { success: true, txHash: result.txHash };
      } else {
        return { success: false, error: result.error || "Payment verification failed" };
      }
    } catch (error) {
      console.error("Payment failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Payment failed",
      };
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, account, client]);

  const getClient = useCallback(() => client, [client]);

  const getAccount = useCallback(() => account, [account]);

  const exportPrivateKey = useCallback((): string | null => {
    if (!account) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (account as any).privateKey?.toString() || null;
  }, [account]);

  /**
   * Check if the account is registered for TUSDC
   */
  const isRegisteredForTusdc = useCallback(async (): Promise<boolean> => {
    if (!walletAddress || !client) return false;

    try {
      const resources = await client.getAccountResources({
        accountAddress: AccountAddress.from(walletAddress),
      });

      const coinStore = resources.find(
        (r) => r.type === `0x1::coin::CoinStore<${stablecoin.coinType}>`
      );

      return !!coinStore;
    } catch (error) {
      console.error("Error checking TUSDC registration:", error);
      return false;
    }
  }, [walletAddress, client, stablecoin.coinType]);

  /**
   * Register the account for TUSDC coin type using gas sponsorship
   * In Move VM, accounts must explicitly register for a coin type before receiving tokens
   * Uses Facilitator to pay gas fees so new users don't need MOVE tokens
   */
  const registerForTusdc = useCallback(async (): Promise<{ success: boolean; txHash?: string; error?: string }> => {
    if (!account) {
      return { success: false, error: "Wallet not connected" };
    }
    if (!client) {
      return { success: false, error: "Client not initialized" };
    }
    if (!walletAddress) {
      return { success: false, error: "Wallet address not available" };
    }

    try {
      // Check if already registered
      const alreadyRegistered = await isRegisteredForTusdc();
      if (alreadyRegistered) {
        console.log("✅ Already registered for TUSDC");
        return { success: true };
      }

      console.log("📝 Registering for TUSDC coin type (gas sponsored)...");

      // Step 1: Build sponsored registration transaction via backend
      console.log("🔧 Building sponsored registration transaction...");
      const sponsoredTx = await api.buildSponsoredRegistration({
        senderAddress: walletAddress,
        coinType: stablecoin.coinType,
      });

      console.log("💰 Registration sponsored by:", sponsoredTx.feePayerAddress);

      // Step 2: Deserialize and sign the transaction as sender only
      console.log("✍️ Signing transaction (sender only, gas paid by Facilitator)...");
      const txBytes = new Uint8Array(Buffer.from(sponsoredTx.transactionBytes, 'hex'));
      const transaction = SimpleTransaction.deserialize(new Deserializer(txBytes));

      const senderAuthenticator = client.transaction.sign({
        signer: account,
        transaction,
      });

      // Serialize the authenticator
      const senderAuthenticatorBytes = Buffer.from(senderAuthenticator.bcsToBytes()).toString('hex');

      // Step 3: Submit to backend - Facilitator co-signs as fee payer and broadcasts
      console.log("📤 Submitting to Facilitator for gas sponsorship...");
      const result = await api.submitSponsoredRegistration({
        transactionBytes: sponsoredTx.transactionBytes,
        senderAuthenticatorBytes,
        coinType: stablecoin.coinType,
      });

      if (result.success && result.txHash) {
        console.log("✅ TUSDC registration successful:", result.txHash);
        return { success: true, txHash: result.txHash };
      } else {
        return { success: false, error: result.error || "Registration failed" };
      }
    } catch (error) {
      console.error("TUSDC registration failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Registration failed",
      };
    }
  }, [account, client, walletAddress, stablecoin.coinType, isRegisteredForTusdc]);

  return (
    <PrivyWalletContext.Provider
      value={{
        address: walletAddress,
        isConnected: !!walletAddress && authenticated,
        isLoading: isLoading || !ready,
        isDerivingWallet,
        connect,
        disconnect,
        getBalance,
        getStablecoinBalance,
        signMessage,
        signAndSubmitTransaction,
        payTab,
        getClient,
        getAccount,
        exportPrivateKey,
        registerForTusdc,
        isRegisteredForTusdc,
      }}
    >
      {children}
    </PrivyWalletContext.Provider>
  );
}

export function usePrivyWallet() {
  const context = useContext(PrivyWalletContext);
  if (!context) {
    throw new Error("usePrivyWallet must be used within PrivyWalletProvider");
  }
  return context;
}
