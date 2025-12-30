import { ITabProps } from "@/types/tab";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function useTab(tabId: string | undefined) {
  return useQuery<ITabProps | null>({
    queryKey: [`tab_${tabId}`],
    queryFn: async (): Promise<ITabProps | null> => {
      if (!tabId) return null;
      try {
        return await api.getTab(tabId);
      } catch {
        return null;
      }
    },
    enabled: !!tabId,
    refetchInterval: 5000,
  });
}
