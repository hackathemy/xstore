import { IStoreProps } from "@/types/store";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function useStores() {
  return useQuery<IStoreProps[]>({
    queryKey: ["stores"],
    queryFn: async (): Promise<IStoreProps[]> => {
      try {
        return await api.getStores();
      } catch {
        return [];
      }
    },
  });
}
