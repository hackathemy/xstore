import { IMenuItemProps } from "@/types/tab";
import { useQuery } from "@tanstack/react-query";

const fetchMenuItems = async (storeId: string): Promise<IMenuItemProps[]> => {
  const response = await fetch(`/api/menu-items?storeId=${storeId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch menu items");
  }
  return response.json();
};

export default function useMenuItems(storeId: string | undefined) {
  return useQuery({
    queryKey: [`menuItems_${storeId}`],
    queryFn: () => fetchMenuItems(storeId!),
    enabled: !!storeId,
  });
}
