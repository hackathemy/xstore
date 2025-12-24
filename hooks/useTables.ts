import { ITableProps } from "@/types/tab";
import { useQuery } from "@tanstack/react-query";

const fetchTables = async (storeId: string): Promise<ITableProps[]> => {
  const response = await fetch(`/api/tables?storeId=${storeId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch tables");
  }
  return response.json();
};

export default function useTables(storeId: string | undefined) {
  return useQuery({
    queryKey: [`tables_${storeId}`],
    queryFn: () => fetchTables(storeId!),
    enabled: !!storeId,
  });
}
