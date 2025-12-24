"use client";

import { Badge } from "./badge";
import { TAB_STATUS_CONFIG, RESERVATION_STATUS_CONFIG } from "@/lib/constants";
import type { TabStatus } from "@/types/tab";
import type { ReservationStatus } from "@/types/reservation";

interface StatusBadgeProps {
  status: TabStatus | ReservationStatus;
  type: "tab" | "reservation";
}

export function StatusBadge({ status, type }: StatusBadgeProps) {
  const config = type === "tab"
    ? TAB_STATUS_CONFIG[status as TabStatus]
    : RESERVATION_STATUS_CONFIG[status as ReservationStatus];

  if (!config) return null;

  return (
    <Badge className={`${config.bg} ${config.color} border-0`}>
      {config.label || status}
    </Badge>
  );
}
