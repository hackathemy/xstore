import { ITableProps } from "@/types/tab";
import { useQuery } from "@tanstack/react-query";

// Tables are managed through the tabs system with tableNumber
// This hook returns virtual table list based on store's tabs
export default function useTables(storeId: string | undefined) {
  return useQuery<ITableProps[]>({
    queryKey: [`tables_${storeId}`],
    queryFn: async (): Promise<ITableProps[]> => {
      // Tables are not separately managed - return empty for now
      return [];
    },
    enabled: !!storeId,
  });
}
