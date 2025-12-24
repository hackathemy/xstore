import { IReservationProps } from "@/types/reservation";
import { useQuery } from "@tanstack/react-query";

export default function useReservations(storeId?: string) {
  return useQuery<IReservationProps[]>({
    queryKey: [`reservations_${storeId || 'all'}`],
    queryFn: async (): Promise<IReservationProps[]> => {
      const url = storeId ? `/api/reservations?storeId=${storeId}` : "/api/reservations";
      const response = await fetch(url);
      if (!response.ok) return [];

      const reservations = await response.json();
      return reservations;
    },
  });
}
