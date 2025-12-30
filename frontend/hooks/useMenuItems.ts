import { IMenuItemProps } from "@/types/tab";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function useMenuItems(storeId: string | undefined) {
  return useQuery<IMenuItemProps[]>({
    queryKey: [`menuItems_${storeId}`],
    queryFn: async (): Promise<IMenuItemProps[]> => {
      if (!storeId) return [];
      try {
        // Menu items are included in store data
        const store = await api.getStore(storeId);
        return store?.menuItems || [];
      } catch {
        return [];
      }
    },
    enabled: !!storeId,
  });
}
