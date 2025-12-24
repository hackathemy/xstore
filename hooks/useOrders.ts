import { IOrderProps } from "@/types/order";
import { useQuery } from "@tanstack/react-query";

export default function useOrders(storeId?: string) {
  return useQuery<IOrderProps[]>({
    queryKey: [`orders_${storeId || 'all'}`],
    queryFn: async (): Promise<IOrderProps[]> => {
      const url = storeId ? `/api/orders?storeId=${storeId}` : "/api/orders";
      const response = await fetch(url);
      if (!response.ok) return [];

      const orders = await response.json();
      return orders;
    },
  });
}
