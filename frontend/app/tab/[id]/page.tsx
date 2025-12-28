"use client";

import { Button } from "@/components/ui/button";
import { PageLayout } from "@/components/layout";
import { EmptyState, EmptyStateIcons } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import useTab from "@/hooks/useTab";
import { usePayment } from "@/hooks/usePayment";
import { usePrivy } from "@privy-io/react-auth";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { TabStatus } from "@/types/tab";

export default function TabPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id: tabId } = params as { id: string };
  const { authenticated } = usePrivy();
  const { payTab, isConnected } = usePayment();
  const { data: tab, isLoading: tabLoading } = useTab(tabId);

  const [isClosing, setIsClosing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "paying" | "confirming">("idle");

  const handleCloseTab = async () => {
    if (!tab || !isConnected) return;

    setIsClosing(true);
    try {
      setPaymentStatus("paying");

      // x402 Payment Flow: Sign permit and let facilitator execute
      const result = await payTab(tabId);

      if (!result.success) {
        throw new Error(result.error || "Payment failed");
      }

      setPaymentStatus("confirming");

      // Payment successful - refresh tab data
      queryClient.invalidateQueries({ queryKey: [`tab_${tabId}`] });
      alert(`Payment successful!\nTX: ${result.txHash?.slice(0, 10)}...`);
    } catch (error) {
      console.error("Error closing tab:", error);
      alert(error instanceof Error ? error.message : "Failed to close tab. Please try again.");
    } finally {
      setIsClosing(false);
      setPaymentStatus("idle");
    }
  };

  const getButtonText = () => {
    if (isClosing) {
      if (paymentStatus === "paying") return "Sign & Pay...";
      if (paymentStatus === "confirming") return "Confirming...";
      return "Processing...";
    }
    return `Pay ${tab?.totalAmount || 0} TUSD`;
  };

  if (tabLoading) {
    return (
      <PageLayout maxWidth="lg">
        <LoadingSpinner size="lg" text="Loading tab..." />
      </PageLayout>
    );
  }

  if (!tab) {
    return (
      <PageLayout maxWidth="lg">
        <EmptyState
          icon={EmptyStateIcons.notFound}
          title="Tab Not Found"
          description="This tab doesn't exist"
          action={{
            label: "Back to Home",
            onClick: () => router.push("/"),
          }}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout maxWidth="lg">
      {/* Tab Header */}
      <div className="w-full flex justify-between items-start mb-6 animate-fade-in-up">
        <div>
          <h2 className="text-2xl font-bold text-white">Your Tab</h2>
          <p className="text-gray-400">{tab.store?.name}</p>
          {tab.table && (
            <p className="text-sm text-gray-500">Table {tab.table.number}</p>
          )}
        </div>
        <StatusBadge status={tab.status as TabStatus} type="tab" />
      </div>

      {/* Tab Items */}
      <div className="w-full card-elevated p-5 mb-6 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Items
        </h3>
        {tab.items.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">No items yet</p>
        ) : (
          <div className="space-y-3">
            {tab.items.map((item) => (
              <div key={item.id} className="flex justify-between items-center py-3 border-b border-white/5 last:border-0">
                <div>
                  <p className="font-medium text-white">{item.name}</p>
                  <p className="text-xs text-gray-500">
                    {item.price} TUSD × {item.quantity}
                  </p>
                  {item.note && (
                    <p className="text-xs text-gray-600 italic mt-1">{item.note}</p>
                  )}
                </div>
                <p className="font-medium text-violet-400">
                  {(parseFloat(item.price) * item.quantity).toFixed(2)} TUSD
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Total */}
        <div className="border-t border-white/10 mt-4 pt-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Total</span>
            <span className="text-2xl font-bold gradient-text">{tab.totalAmount} TUSD</span>
          </div>
        </div>
      </div>

      {/* Payment Info */}
      {tab.status === "PAID" && tab.paymentTxHash && (
        <div className="w-full card-elevated p-5 mb-6 border-emerald-500/20 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-emerald-400 font-medium">Payment Completed</p>
          </div>
          <p className="text-sm text-violet-400 flex items-center gap-1">
            TX: {tab.paymentTxHash.slice(0, 20)}...
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="w-full space-y-3 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
        {(tab.status === "OPEN" || tab.status === "PENDING_PAYMENT") && (
          <>
            <Button
              onClick={handleCloseTab}
              disabled={isClosing || !isConnected || tab.items.length === 0}
              className="w-full h-14 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-lg font-semibold"
            >
              {isClosing ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {getButtonText()}
                </div>
              ) : (
                getButtonText()
              )}
            </Button>

            {tab.status === "OPEN" && tab.table && (
              <Button
                variant="outline"
                className="w-full h-12 border-white/10 hover:bg-white/10"
                onClick={() => router.push(`/store/${tab.storeId}/table/${tab.tableId}`)}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Order More
              </Button>
            )}

            {!isConnected && authenticated && (
              <p className="text-xs text-yellow-400 text-center">
                Connect wallet to pay
              </p>
            )}
          </>
        )}

        {tab.status === "PAID" && (
          <Button
            variant="outline"
            className="w-full h-12 border-white/10 hover:bg-white/10"
            onClick={() => router.push("/")}
          >
            Back to Home
          </Button>
        )}
      </div>
    </PageLayout>
  );
}
