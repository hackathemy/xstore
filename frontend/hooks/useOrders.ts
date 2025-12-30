import { IOrderProps } from "@/types/order";
import { useQuery } from "@tanstack/react-query";

// Orders are managed through the tabs/payments system
export default function useOrders(storeId?: string) {
  return useQuery<IOrderProps[]>({
    queryKey: [`orders_${storeId || 'all'}`],
    queryFn: async (): Promise<IOrderProps[]> => {
      // Orders are handled through tabs - return empty for now
      return [];
    },
  });
}
