import { IStoreProps } from "@/types/store";
import { useQuery } from "@tanstack/react-query";

export default function useStores() {
  return useQuery<IStoreProps[]>({
    queryKey: ["stores"],
    queryFn: async (): Promise<IStoreProps[]> => {
      const response = await fetch("/api/stores");
      if (!response.ok) return [];

      const stores = await response.json();
      return stores;
    },
  });
}
