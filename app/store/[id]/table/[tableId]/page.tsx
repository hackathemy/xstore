"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageLayout } from "@/components/layout";
import { EmptyState, EmptyStateIcons } from "@/components/ui/empty-state";
import useStore from "@/hooks/useStore";
import useMenuItems from "@/hooks/useMenuItems";
import { usePrivy } from "@privy-io/react-auth";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { IMenuItemProps, ITabProps } from "@/types/tab";

export default function TableOrderPage() {
  const params = useParams();
  const router = useRouter();
  const { id: storeId, tableId } = params as { id: string; tableId: string };
  const { user, authenticated } = usePrivy();
  const address = user?.wallet?.address;
  const { data: store } = useStore(storeId);
  const { data: menuItems } = useMenuItems(storeId);

  const [tab, setTab] = useState<ITabProps | null>(null);
  const [cart, setCart] = useState<{ item: IMenuItemProps; quantity: number }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tableInfo, setTableInfo] = useState<{ number: number; name?: string } | null>(null);

  // Fetch table info
  useEffect(() => {
    const fetchTable = async () => {
      try {
        const response = await fetch(`/api/tables/${tableId}`);
        if (response.ok) {
          const data = await response.json();
          setTableInfo({ number: data.number, name: data.name });
        }
      } catch (error) {
        console.error("Error fetching table:", error);
      }
    };
    fetchTable();
  }, [tableId]);

  // Check for existing tab when user connects
  useEffect(() => {
    const checkExistingTab = async () => {
      if (!address || !storeId) return;
      try {
        const response = await fetch(`/api/tabs?storeId=${storeId}&customer=${address}&status=OPEN`);
        if (response.ok) {
          const tabs = await response.json();
          if (tabs.length > 0) {
            setTab(tabs[0]);
          }
        }
      } catch (error) {
        console.error("Error checking existing tab:", error);
      }
    };
    checkExistingTab();
  }, [address, storeId]);

  const addToCart = (item: IMenuItemProps) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map((c) =>
          c.item.id === itemId ? { ...c, quantity: c.quantity - 1 } : c
        );
      }
      return prev.filter((c) => c.item.id !== itemId);
    });
  };

  const cartTotal = cart.reduce(
    (sum, { item, quantity }) => sum + parseFloat(item.price) * quantity,
    0
  );

  const openTabAndAddItems = async () => {
    if (!address || !store || cart.length === 0) return;

    setIsLoading(true);
    try {
      // Create or get existing tab
      let currentTab = tab;
      if (!currentTab) {
        const tabResponse = await fetch("/api/tabs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storeId: store.id,
            tableId,
            customer: address,
            customerName: user?.email?.address || address.slice(0, 8),
          }),
        });
        currentTab = await tabResponse.json();
        setTab(currentTab);
      }

      // Add items to tab
      for (const { item, quantity } of cart) {
        await fetch(`/api/tabs/${currentTab!.id}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            menuItemId: item.id,
            name: item.name,
            price: item.price,
            quantity,
          }),
        });
      }

      // Clear cart and show success
      setCart([]);
      alert("Order added to your tab!");

      // Refresh tab data
      const updatedTab = await fetch(`/api/tabs/${currentTab!.id}`).then(r => r.json());
      setTab(updatedTab);
    } catch (error) {
      console.error("Error processing order:", error);
      alert("Failed to process order. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const groupedMenuItems = menuItems?.reduce((acc, item) => {
    const category = item.category || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, IMenuItemProps[]>);

  if (!store) {
    return (
      <PageLayout maxWidth="lg">
        <EmptyState
          icon={EmptyStateIcons.notFound}
          title="Store Not Found"
          description="This store doesn't exist"
          action={{
            label: "Browse Stores",
            onClick: () => router.push("/stores"),
          }}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout maxWidth="lg" className="pb-32">
      {/* Store Header */}
      <div className="w-full card-elevated p-4 mb-6 animate-fade-in-up">
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
            <Image src={store.image} alt={store.name} fill className="object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white truncate">{store.name}</h1>
            {tableInfo && (
              <Badge className="bg-violet-500/20 text-violet-400 border-0 mt-1">
                Table {tableInfo.number} {tableInfo.name && `- ${tableInfo.name}`}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Active Tab Banner */}
      {tab && (
        <div className="w-full card-elevated p-4 mb-6 border-emerald-500/20 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-emerald-400">Your tab is open</p>
                <p className="text-lg font-bold text-white">{tab.totalAmount} MOVE</p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => router.push(`/tab/${tab.id}`)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              View Tab
            </Button>
          </div>
        </div>
      )}

      {/* Menu Items */}
      <div className="w-full animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Menu
        </h2>

        {groupedMenuItems && Object.entries(groupedMenuItems).map(([category, items]) => (
          <div key={category} className="mb-6">
            <h3 className="text-md font-semibold mb-3 text-gray-400">{category}</h3>
            <div className="space-y-2">
              {items.map((item) => {
                const cartItem = cart.find((c) => c.item.id === item.id);
                return (
                  <div
                    key={item.id}
                    className="card-elevated p-4 flex justify-between items-center"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-white">{item.name}</h4>
                      {item.description && (
                        <p className="text-xs text-gray-500 truncate">{item.description}</p>
                      )}
                      <p className="text-sm text-violet-400 font-medium mt-1">{item.price} MOVE</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {cartItem ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-8 h-8 p-0 border-white/10"
                            onClick={() => removeFromCart(item.id)}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center text-white font-medium">{cartItem.quantity}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-8 h-8 p-0 border-white/10"
                            onClick={() => addToCart(item)}
                          >
                            +
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => addToCart(item)}
                          className="bg-violet-600 hover:bg-violet-700"
                        >
                          Add
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* If no menu items, show default store menu */}
        {(!menuItems || menuItems.length === 0) && (
          <div className="card-elevated p-4 mb-4">
            <h4 className="font-medium text-white">{store.menu}</h4>
            <p className="text-sm text-violet-400 font-medium mt-1">{store.price} MOVE</p>
            <Button
              size="sm"
              className="mt-3 bg-violet-600 hover:bg-violet-700"
              onClick={() => {
                const defaultItem: IMenuItemProps = {
                  id: "default",
                  storeId: store.id,
                  name: store.menu,
                  price: store.price,
                  available: true,
                };
                addToCart(defaultItem);
              }}
            >
              Add to Order
            </Button>
          </div>
        )}
      </div>

      {/* Cart Summary - Fixed Bottom */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-white/10 p-4 animate-fade-in-up">
          <div className="max-w-lg mx-auto">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <span className="text-gray-400">
                  {cart.reduce((sum, c) => sum + c.quantity, 0)} items
                </span>
              </div>
              <span className="font-bold text-xl gradient-text">{cartTotal.toFixed(4)} MOVE</span>
            </div>
            <Button
              className="w-full h-12 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 font-semibold"
              onClick={openTabAndAddItems}
              disabled={isLoading || !authenticated}
            >
              {isLoading
                ? "Processing..."
                : tab
                ? "Add to Tab"
                : "Open Tab & Order"}
            </Button>
            {!authenticated && (
              <p className="text-xs text-yellow-400 text-center mt-2">
                Connect wallet to order
              </p>
            )}
          </div>
        </div>
      )}
    </PageLayout>
  );
}
