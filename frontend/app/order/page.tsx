"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageLayout } from "@/components/layout";
import { EmptyState, EmptyStateIcons } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { usePrivy } from "@privy-io/react-auth";
import useMyStore from "@/hooks/useMyStore";
import useOrders from "@/hooks/useOrders";
import { ellipsisAddress } from "@/utils/strings";
import { useRouter } from "next/navigation";

export default function OrdersPage() {
  const router = useRouter();
  const { user } = usePrivy();
  const address = user?.wallet?.address;
  const { data: store } = useMyStore(address);
  const { data: orders, isLoading } = useOrders(store?.id);

  // No store state
  if (!store) {
    return (
      <PageLayout>
        <EmptyState
          icon={EmptyStateIcons.order}
          title="No Store Found"
          description="Create a store first to view orders"
          action={{
            label: "Create Store",
            onClick: () => router.push("/make-store"),
          }}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      {/* Page Title */}
      <div className="w-full mb-6 animate-fade-in-up">
        <h1 className="text-2xl font-bold text-white mb-1">Recent Orders</h1>
        <p className="text-gray-400 text-sm">Orders for {store.name}</p>
      </div>

      {/* Loading State */}
      {isLoading && <LoadingSkeleton variant="card" count={4} />}

      {/* Empty State */}
      {!isLoading && (!orders || orders.length === 0) && (
        <EmptyState
          icon={EmptyStateIcons.order}
          title="No orders yet"
          description="Orders will appear here when customers place them"
        />
      )}

      {/* Orders List */}
      {!isLoading && orders && orders.length > 0 && (
        <div className="w-full space-y-3 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          {orders.map((order, index) => (
            <div
              key={order.id}
              className="card-elevated p-4 hover-lift"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex justify-between items-start mb-2">
                <Badge variant="outline" className="border-white/20 text-gray-400">
                  {ellipsisAddress(order.customer)}
                </Badge>
                <span className="font-bold text-violet-400">{order.price} USDC</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">
                  {new Date(order.createdAt || order.created).toLocaleString()}
                </span>
                <span className="text-gray-400">×{order.count}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
