import { IStoreProps } from "@/types/store";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function useStore(id: string | undefined) {
  return useQuery<IStoreProps | null>({
    queryKey: [`store_${id}`],
    queryFn: async (): Promise<IStoreProps | null> => {
      if (!id) return null;
      try {
        return await api.getStore(id);
      } catch {
        return null;
      }
    },
    enabled: !!id,
  });
}
