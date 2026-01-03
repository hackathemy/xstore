"use client";

import { Button } from "@/components/ui/button";
import { PageLayout } from "@/components/layout";
import { EmptyState, EmptyStateIcons } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { usePrivy } from "@privy-io/react-auth";
import { useState } from "react";
import { useRouter } from "next/navigation";
import useTabs from "@/hooks/useTabs";
import type { TabStatus } from "@/types/tab";

type FilterType = "all" | "OPEN" | "PAID";

export default function MyTabsPage() {
  const router = useRouter();
  const { user, authenticated } = usePrivy();
  const address = user?.wallet?.address;

  const { data: tabs = [], isLoading } = useTabs({ customer: address });
  const [filter, setFilter] = useState<FilterType>("all");

  const filteredTabs = tabs.filter((tab) => {
    if (filter === "all") return true;
    return tab.status === filter;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Not authenticated
  if (!authenticated) {
    return (
      <PageLayout>
        <div className="w-full mb-6 animate-fade-in-up">
          <h1 className="text-2xl font-bold text-white mb-1">My Tabs</h1>
          <p className="text-gray-400 text-sm">Track your orders and payments</p>
        </div>
        <EmptyState
          icon={
            <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          }
          title="Connect Your Wallet"
          description="Connect your wallet to view your tabs"
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      {/* Page Title */}
      <div className="w-full mb-6 animate-fade-in-up">
        <h1 className="text-2xl font-bold text-white mb-1">My Tabs</h1>
        <p className="text-gray-400 text-sm">Track your orders and payments</p>
      </div>

      {/* Filter Buttons */}
      <div className="w-full flex gap-2 mb-6 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
        {[
          { value: "all", label: "All" },
          { value: "OPEN", label: "Open" },
          { value: "PAID", label: "Paid" },
        ].map((item) => (
          <Button
            key={item.value}
            size="sm"
            variant={filter === item.value ? "default" : "outline"}
            onClick={() => setFilter(item.value as FilterType)}
            className={
              filter === item.value
                ? "bg-violet-600 hover:bg-violet-700"
                : "border-white/10 hover:bg-white/10"
            }
          >
            {item.label}
          </Button>
        ))}
      </div>

      {/* Loading State */}
      {isLoading && <LoadingSkeleton variant="card" count={3} />}

      {/* Empty State */}
      {!isLoading && filteredTabs.length === 0 && (
        <EmptyState
          icon={EmptyStateIcons.tab}
          title="No tabs yet"
          description="Scan a table QR code to start ordering!"
          action={{
            label: "Browse Stores",
            onClick: () => router.push("/stores"),
          }}
        />
      )}

      {/* Tabs List */}
      {!isLoading && filteredTabs.length > 0 && (
        <div className="w-full space-y-3 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          {filteredTabs.map((tab, index) => (
            <div
              key={tab.id}
              className="card-elevated p-4 cursor-pointer hover-lift"
              style={{ animationDelay: `${index * 0.1}s` }}
              onClick={() => router.push(`/tab/${tab.id}`)}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold text-white">
                    {tab.store?.name || "Store"}
                  </h3>
                  {tab.table && (
                    <p className="text-sm text-gray-400">Table {tab.table.number}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDate(tab.createdAt!)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-violet-400 mb-1">
                    {tab.totalAmount} USDC
                  </p>
                  <StatusBadge status={tab.status as TabStatus} type="tab" />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <span className="text-sm text-gray-500">
                  {tab.items?.length || 0} items
                </span>
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
