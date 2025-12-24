// Status configurations for tabs and reservations
export const TAB_STATUS_CONFIG = {
  OPEN: { color: "text-emerald-400", bg: "bg-emerald-500/20", label: "Open" },
  PENDING_PAYMENT: { color: "text-yellow-400", bg: "bg-yellow-500/20", label: "Pending Payment" },
  PAID: { color: "text-blue-400", bg: "bg-blue-500/20", label: "Paid" },
  CANCELLED: { color: "text-red-400", bg: "bg-red-500/20", label: "Cancelled" },
} as const;

export const RESERVATION_STATUS_CONFIG = {
  PENDING: { color: "text-yellow-400", bg: "bg-yellow-500/20", label: "Pending" },
  CONFIRMED: { color: "text-emerald-400", bg: "bg-emerald-500/20", label: "Confirmed" },
  CANCELLED: { color: "text-red-400", bg: "bg-red-500/20", label: "Cancelled" },
  COMPLETED: { color: "text-blue-400", bg: "bg-blue-500/20", label: "Completed" },
} as const;

// Movement blockchain explorer
export const MOVEMENT_EXPLORER_URL = "https://explorer.movementlabs.xyz";

// Reservation fee
export const RESERVATION_FEE = "0.001";

// App info
export const APP_NAME = "XStore";
