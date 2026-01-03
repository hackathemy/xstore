"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import { usePrivyWallet } from "@/context/PrivyWalletContext";
import { api } from "@/lib/api";

interface FaucetInfo {
  tokenName: string;
  tokenSymbol: string;
  coinType: string;
  decimals: number;
  amountPerRequest: string;
  network: string;
  nodeUrl: string;
}

export default function ChargePage() {
  const router = useRouter();
  const { address, isConnected, getStablecoinBalance } = usePrivyWallet();

  const [faucetInfo, setFaucetInfo] = useState<FaucetInfo | null>(null);
  const [balance, setBalance] = useState<string>("0");
  const [isLoading, setIsLoading] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; txHash?: string } | null>(null);

  // Load faucet info and balance
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const info = await api.getFaucetInfo();
        setFaucetInfo(info);

        if (address) {
          const balanceResult = await api.getFaucetBalance(address);
          setBalance(balanceResult.balance);
        }
      } catch (error) {
        console.error("Failed to load faucet info:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [address]);

  // Refresh balance after successful request
  const refreshBalance = async () => {
    if (address) {
      try {
        const balanceResult = await api.getFaucetBalance(address);
        setBalance(balanceResult.balance);
      } catch (error) {
        console.error("Failed to refresh balance:", error);
      }
    }
  };

  const handleRequestTokens = async () => {
    if (!address) {
      setResult({ success: false, message: "Please connect your wallet first" });
      return;
    }

    setIsRequesting(true);
    setResult(null);

    try {
      const response = await api.requestFaucet(address);

      if (response.success) {
        setResult({
          success: true,
          message: `Successfully received ${response.amount}!`,
          txHash: response.txHash,
        });
        // Refresh balance after a short delay
        setTimeout(refreshBalance, 3000);
      } else {
        setResult({
          success: false,
          message: response.error || "Failed to request tokens",
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "Failed to request tokens",
      });
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/30 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-violet-500/20 rounded-full blur-[100px]" />
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-fuchsia-500/20 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center px-6 py-8 max-w-md mx-auto">
        <Header className="mb-8" />

        {/* Back Button */}
        <div className="w-full mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Button>
        </div>

        {/* Page Title */}
        <div className="w-full text-center mb-8 animate-fade-in">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center animate-float">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">TUSDC Faucet</h1>
          <p className="text-gray-400">Get test TUSDC tokens for free</p>
        </div>

        {/* Balance Card */}
        <div className="w-full card-elevated p-6 mb-6 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-400">Your Balance</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshBalance}
              disabled={!address}
              className="text-violet-400 hover:text-violet-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </Button>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-white">
              {isLoading ? "..." : balance}
            </span>
            <span className="text-xl text-gray-400">TUSDC</span>
          </div>
          {address && (
            <p className="mt-3 text-sm text-gray-500 font-mono truncate">
              {address.slice(0, 10)}...{address.slice(-8)}
            </p>
          )}
        </div>

        {/* Faucet Info Card */}
        {faucetInfo && (
          <div className="w-full card-elevated p-6 mb-6 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Faucet Information
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Token</span>
                <span className="text-white">{faucetInfo.tokenName} ({faucetInfo.tokenSymbol})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Amount per request</span>
                <span className="text-green-400 font-semibold">{faucetInfo.amountPerRequest}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Network</span>
                <span className="text-white">{faucetInfo.network}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Decimals</span>
                <span className="text-white">{faucetInfo.decimals}</span>
              </div>
            </div>
          </div>
        )}

        {/* Request Button */}
        <div className="w-full animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
          {!isConnected ? (
            <div className="text-center p-6 card-elevated">
              <p className="text-gray-400 mb-4">Connect your wallet to request tokens</p>
              <Button
                onClick={() => router.push("/")}
                className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700"
              >
                Connect Wallet
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleRequestTokens}
              disabled={isRequesting}
              size="lg"
              className="w-full h-14 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-lg font-semibold transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-green-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRequesting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Requesting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Request 100 TUSDC
                </>
              )}
            </Button>
          )}
        </div>

        {/* Result Message */}
        {result && (
          <div
            className={`w-full mt-6 p-4 rounded-xl animate-fade-in ${
              result.success
                ? "bg-green-500/20 border border-green-500/30"
                : "bg-red-500/20 border border-red-500/30"
            }`}
          >
            <div className="flex items-start gap-3">
              {result.success ? (
                <svg className="w-6 h-6 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <div className="flex-1">
                <p className={result.success ? "text-green-300" : "text-red-300"}>
                  {result.message}
                </p>
                {result.txHash && (
                  <a
                    href={`https://explorer.movementlabs.xyz/txn/${result.txHash}?network=testnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-violet-400 hover:text-violet-300 underline mt-1 inline-block"
                  >
                    View Transaction
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 text-center text-gray-500 text-sm animate-fade-in">
          <p>Powered by Movement Network</p>
        </footer>
      </div>
    </main>
  );
}
