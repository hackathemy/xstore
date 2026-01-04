"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getActiveNetwork } from "@/lib/movement";

interface ReservationSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  txHash?: string;
  reservationDetails: {
    customerName: string;
    date: string;
    time: string;
    partySize: string;
    storeName: string;
  };
}

export function ReservationSuccessModal({
  isOpen,
  onClose,
  txHash,
  reservationDetails,
}: ReservationSuccessModalProps) {
  const [copied, setCopied] = useState(false);
  const network = getActiveNetwork();

  const explorerUrl = txHash
    ? `https://explorer.movementlabs.xyz/txn/${txHash}?network=${network.isTestnet ? 'testnet' : 'mainnet'}`
    : null;

  const copyTxHash = async () => {
    if (!txHash) return;
    await navigator.clipboard.writeText(txHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shortenHash = (hash: string) => {
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });
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
              {/* Calendar Check Icon */}
              <svg
                className="w-12 h-12 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M9 14l2 2 4-4"
                />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-white mb-2 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            Reservation Confirmed!
          </h2>

          {/* Store Name */}
          <p className="text-gray-400 text-sm animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
            at {reservationDetails.storeName}
          </p>

          {/* Reservation Details */}
          <div
            className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10 space-y-3 animate-fade-in-up"
            style={{ animationDelay: '0.3s' }}
          >
            {/* Customer Name */}
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Name</span>
              <span className="text-white font-medium">{reservationDetails.customerName}</span>
            </div>

            {/* Date */}
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Date</span>
              <span className="text-white font-medium">{formatDate(reservationDetails.date)}</span>
            </div>

            {/* Time */}
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Time</span>
              <span className="text-white font-medium">{reservationDetails.time}</span>
            </div>

            {/* Party Size */}
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Party Size</span>
              <span className="text-white font-medium">
                {reservationDetails.partySize} {parseInt(reservationDetails.partySize) === 1 ? 'person' : 'people'}
              </span>
            </div>
          </div>

          {/* Transaction Details (if paid) */}
          {txHash && (
            <div
              className="mt-4 p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 animate-fade-in-up"
              style={{ animationDelay: '0.4s' }}
            >
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Payment Transaction</p>
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
          )}

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
            {explorerUrl && (
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
            )}

            <Button
              variant={explorerUrl ? "outline" : "default"}
              className={explorerUrl
                ? "w-full h-12 border-white/10 hover:bg-white/10"
                : "w-full h-12 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 font-semibold"
              }
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
            We look forward to seeing you!
          </p>
        </div>
      </div>
    </div>
  );
}
