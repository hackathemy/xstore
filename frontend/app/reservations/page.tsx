"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageLayout } from "@/components/layout";
import { EmptyState, EmptyStateIcons } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { usePrivy } from "@privy-io/react-auth";
import useMyStore from "@/hooks/useMyStore";
import useReservations from "@/hooks/useReservations";
import { ellipsisAddress } from "@/utils/strings";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MOVEMENT_EXPLORER_URL } from "@/lib/constants";

export default function ReservationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = usePrivy();
  const address = user?.wallet?.address;
  const { data: store } = useMyStore(address);
  const { data: reservations, isLoading } = useReservations(store?.id);
  const [updating, setUpdating] = useState<string | null>(null);

  const updateStatus = async (reservationId: string, status: string) => {
    setUpdating(reservationId);
    try {
      const response = await fetch(`/api/reservations/${reservationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error("Failed to update reservation");
      }

      queryClient.invalidateQueries({ queryKey: [`reservations_${store?.id}`] });
    } catch (error) {
      console.error("Error updating reservation:", error);
      alert("Failed to update reservation");
    } finally {
      setUpdating(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // No store state
  if (!store) {
    return (
      <PageLayout maxWidth="4xl">
        <EmptyState
          icon={EmptyStateIcons.calendar}
          title="No Store Found"
          description="Create a store first to manage reservations"
          action={{
            label: "Create Store",
            onClick: () => router.push("/make-store"),
          }}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout maxWidth="4xl">
      {/* Page Title */}
      <div className="w-full mb-6 animate-fade-in-up">
        <h1 className="text-2xl font-bold text-white mb-1">Reservations</h1>
        <p className="text-gray-400 text-sm">Manage reservations for {store.name}</p>
      </div>

      {/* Loading State */}
      {isLoading && <LoadingSkeleton variant="list" count={3} />}

      {/* Empty State */}
      {!isLoading && (!reservations || reservations.length === 0) && (
        <EmptyState
          icon={EmptyStateIcons.calendar}
          title="No reservations yet"
          description="Reservations will appear here when customers book"
        />
      )}

      {/* Reservations List */}
      {!isLoading && reservations && reservations.length > 0 && (
        <div className="w-full space-y-4 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          {reservations.map((reservation, index) => (
            <div
              key={reservation.id}
              className="card-elevated p-5 hover-lift"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-white">{reservation.customerName}</h3>
                  <Badge variant="outline" className="mt-1 border-white/20 text-gray-400">
                    {ellipsisAddress(reservation.customer)}
                  </Badge>
                </div>
                <StatusBadge status={reservation.status} type="reservation" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                <div className="bg-white/5 rounded-lg p-3">
                  <span className="text-gray-500 text-xs">Date</span>
                  <p className="text-white font-medium">{formatDate(reservation.date)}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <span className="text-gray-500 text-xs">Time</span>
                  <p className="text-white font-medium">{reservation.time}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <span className="text-gray-500 text-xs">Party Size</span>
                  <p className="text-white font-medium">{reservation.partySize} guests</p>
                </div>
                {reservation.phone && (
                  <div className="bg-white/5 rounded-lg p-3">
                    <span className="text-gray-500 text-xs">Phone</span>
                    <p className="text-white font-medium">{reservation.phone}</p>
                  </div>
                )}
              </div>

              {reservation.note && (
                <div className="bg-white/5 rounded-lg p-3 mb-4">
                  <span className="text-gray-500 text-xs">Note</span>
                  <p className="text-gray-300 text-sm">{reservation.note}</p>
                </div>
              )}

              {reservation.paymentTxHash && (
                <div className="bg-violet-500/10 rounded-lg p-3 mb-4">
                  <span className="text-gray-500 text-xs">Payment TX</span>
                  <a
                    href={`${MOVEMENT_EXPLORER_URL}/txn/${reservation.paymentTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1"
                  >
                    {reservation.paymentTxHash.slice(0, 10)}...{reservation.paymentTxHash.slice(-8)}
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              )}

              {reservation.status === "PENDING" && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => updateStatus(reservation.id, "CONFIRMED")}
                    disabled={updating === reservation.id}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {updating === reservation.id ? "..." : "Confirm"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatus(reservation.id, "CANCELLED")}
                    disabled={updating === reservation.id}
                    className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                  >
                    {updating === reservation.id ? "..." : "Cancel"}
                  </Button>
                </div>
              )}

              {reservation.status === "CONFIRMED" && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => updateStatus(reservation.id, "COMPLETED")}
                    disabled={updating === reservation.id}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {updating === reservation.id ? "..." : "Mark Completed"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatus(reservation.id, "CANCELLED")}
                    disabled={updating === reservation.id}
                    className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                  >
                    {updating === reservation.id ? "..." : "Cancel"}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
