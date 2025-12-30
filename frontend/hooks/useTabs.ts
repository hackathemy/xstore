import { ITabProps } from "@/types/tab";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface UseTabsParams {
  storeId?: string;
  customer?: string;
}

export default function useTabs(params?: UseTabsParams) {
  const { storeId, customer } = params || {};
  const key = `tabs_${storeId || "none"}_${customer || "none"}`;

  return useQuery<ITabProps[]>({
    queryKey: [key],
    queryFn: async (): Promise<ITabProps[]> => {
      try {
        if (customer) {
          return await api.getTabsByCustomer(customer);
        }
        if (storeId) {
          return await api.getTabs(storeId);
        }
        return [];
      } catch {
        return [];
      }
    },
    enabled: !!(storeId || customer),
  });
}
