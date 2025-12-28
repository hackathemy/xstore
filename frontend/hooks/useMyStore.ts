import { IStoreProps } from "@/types/store";
import { useQuery } from "@tanstack/react-query";

export default function useMyStore(owner: string | undefined) {
  return useQuery<IStoreProps | null>({
    queryKey: [`stores_owner_${owner}`],
    queryFn: async (): Promise<IStoreProps | null> => {
      if (!owner) return null;

      const response = await fetch(`/api/stores?owner=${owner}`);
      if (!response.ok) return null;

      const store = await response.json();
      return store;
    },
    enabled: !!owner,
  });
}
