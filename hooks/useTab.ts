import { ITabProps } from "@/types/tab";
import { useQuery } from "@tanstack/react-query";

const fetchTab = async (tabId: string): Promise<ITabProps> => {
  const response = await fetch(`/api/tabs/${tabId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch tab");
  }
  return response.json();
};

export default function useTab(tabId: string | undefined) {
  return useQuery({
    queryKey: [`tab_${tabId}`],
    queryFn: () => fetchTab(tabId!),
    enabled: !!tabId,
    refetchInterval: 5000, // Refetch every 5 seconds to get updates
  });
}
