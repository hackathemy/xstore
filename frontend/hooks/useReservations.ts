import { IReservationProps } from "@/types/reservation";
import { useQuery } from "@tanstack/react-query";

// Reservations feature - not yet implemented in backend
export default function useReservations(storeId?: string) {
  return useQuery<IReservationProps[]>({
    queryKey: [`reservations_${storeId || 'all'}`],
    queryFn: async (): Promise<IReservationProps[]> => {
      // Reservations not yet implemented - return empty
      return [];
    },
  });
}
