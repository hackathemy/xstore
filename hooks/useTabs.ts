import { ITabProps } from "@/types/tab";
import { useQuery } from "@tanstack/react-query";

interface UseTabsParams {
  storeId?: string;
  customer?: string;
  status?: string;
}

export default function useTabs(params?: UseTabsParams) {
  const { storeId, customer, status } = params || {};

  const queryParams = new URLSearchParams();
  if (storeId) queryParams.append("storeId", storeId);
  if (customer) queryParams.append("customer", customer);
  if (status) queryParams.append("status", status);

  const queryString = queryParams.toString();
  const url = queryString ? `/api/tabs?${queryString}` : "/api/tabs";
  const key = `tabs_${storeId || "all"}_${customer || "all"}_${status || "all"}`;

  return useQuery<ITabProps[]>({
    queryKey: [key],
    queryFn: async (): Promise<ITabProps[]> => {
      const response = await fetch(url);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!(storeId || customer),
  });
}
