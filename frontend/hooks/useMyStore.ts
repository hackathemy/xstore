import { IStoreProps } from "@/types/store";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function useMyStore(owner: string | undefined) {
  return useQuery<IStoreProps | null>({
    queryKey: [`stores_owner_${owner}`],
    queryFn: async (): Promise<IStoreProps | null> => {
      if (!owner) return null;
      try {
        return await api.getStoreByOwner(owner);
      } catch {
        return null;
      }
    },
    enabled: !!owner,
  });
}
