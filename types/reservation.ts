export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

export interface IReservationProps {
  id: string;
  storeId: string;
  customer: string;
  customerName: string;
  phone?: string;
  date: string;
  time: string;
  partySize: number;
  note?: string;
  paymentTxHash?: string;
  status: ReservationStatus;
  createdAt?: string;
  updatedAt?: string;
}
