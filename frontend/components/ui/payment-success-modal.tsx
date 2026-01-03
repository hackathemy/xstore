"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getActiveNetwork } from "@/lib/movement";

interface PaymentSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  txHash: string;
  amount: string;
  storeName?: string;
}

export function PaymentSuccessModal({
  isOpen,
  onClose,
  txHash,
  amount,
  storeName,
}: PaymentSuccessModalProps) {
  const [copied, setCopied] = useState(false);
  const network = getActiveNetwork();

  const explorerUrl = `https://explorer.movementlabs.xyz/txn/${txHash}?network=${network.isTestnet ? 'testnet' : 'mainnet'}`;

  const copyTxHash = async () => {
    await navigator.clipboard.writeText(txHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shortenHash = (hash: string) => {
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-md mx-4 animate-scale-in">
        <div className="card-elevated p-8 text-center">
          {/* Success Icon with Animation */}
          <div className="relative mx-auto w-24 h-24 mb-6">
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-emerald-500/30 rounded-full blur-xl animate-pulse" />

            {/* Circle */}
            <div className="relative w-full h-full rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center animate-bounce-in">
              {/* Checkmark */}
              <svg
                className="w-12 h-12 text-white animate-draw-check"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-white mb-2 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            Payment Successful!
          </h2>

          {/* Amount */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <p className="text-4xl font-bold gradient-text mb-1">{amount} TUSDC</p>
            {storeName && (
              <p className="text-gray-400 text-sm">paid to {storeName}</p>
            )}
          </div>

          {/* Transaction Details */}
          <div
            className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10 animate-fade-in-up"
            style={{ animationDelay: '0.4s' }}
          >
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Transaction Hash</p>
            <div className="flex items-center justify-center gap-2">
              <code className="text-sm text-violet-400 font-mono">
                {shortenHash(txHash)}
              </code>
              <button
                onClick={copyTxHash}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                title="Copy transaction hash"
              >
                {copied ? (
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Network Badge */}
          <div
            className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 animate-fade-in-up"
            style={{ animationDelay: '0.5s' }}
          >
            <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
            <span className="text-xs text-violet-400">Movement {network.isTestnet ? 'Testnet' : 'Mainnet'}</span>
          </div>

          {/* Actions */}
          <div className="mt-8 space-y-3 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View on Explorer
            </a>

            <Button
              variant="outline"
              className="w-full h-12 border-white/10 hover:bg-white/10"
              onClick={onClose}
            >
              Done
            </Button>
          </div>

          {/* Footer Message */}
          <p
            className="mt-6 text-xs text-gray-500 animate-fade-in-up"
            style={{ animationDelay: '0.7s' }}
          >
            Thank you for your payment!
          </p>
        </div>
      </div>
    </div>
  );
}
