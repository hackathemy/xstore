import { IOrderProps } from "@/types/order";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Orders are managed through the tabs/payments system
export default function useOrders(storeId?: string) {
  return useQuery<IOrderProps[]>({
    queryKey: [`orders_${storeId || 'all'}`],
    queryFn: async (): Promise<IOrderProps[]> => {
      if (!storeId) {
        return [];
      }
      try {
        const orders = await api.getStoreOrders(storeId);
        return orders;
      } catch (error) {
        console.error('Failed to fetch orders:', error);
        return [];
      }
    },
    enabled: !!storeId,
  });
}
