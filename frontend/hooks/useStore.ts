import { IStoreProps } from "@/types/store";
import { useQuery } from "@tanstack/react-query";

export default function useStore(id: string | undefined) {
  return useQuery<IStoreProps | null>({
    queryKey: [`store_${id}`],
    queryFn: async (): Promise<IStoreProps | null> => {
      if (!id) return null;

      const response = await fetch(`/api/stores/${id}`);
      if (!response.ok) return null;

      const store = await response.json();
      return store;
    },
    enabled: !!id,
  });
}
