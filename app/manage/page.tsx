"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageLayout } from "@/components/layout";
import { EmptyState, EmptyStateIcons } from "@/components/ui/empty-state";
import { usePrivy } from "@privy-io/react-auth";
import useMyStore from "@/hooks/useMyStore";
import useTables from "@/hooks/useTables";
import useMenuItems from "@/hooks/useMenuItems";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useQRCode } from "next-qrcode";
import { useRouter } from "next/navigation";

type TabType = "tables" | "menu" | "tabs";

export default function ManagePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { Canvas } = useQRCode();
  const { user } = usePrivy();
  const address = user?.wallet?.address;
  const { data: store } = useMyStore(address);
  const { data: tables } = useTables(store?.id);
  const { data: menuItems } = useMenuItems(store?.id);

  const [activeTab, setActiveTab] = useState<TabType>("tables");
  const [isAdding, setIsAdding] = useState(false);

  // Table form
  const [tableNumber, setTableNumber] = useState("");
  const [tableName, setTableName] = useState("");
  const [tableSeats, setTableSeats] = useState("4");

  // Menu item form
  const [menuName, setMenuName] = useState("");
  const [menuDescription, setMenuDescription] = useState("");
  const [menuPrice, setMenuPrice] = useState("");
  const [menuCategory, setMenuCategory] = useState("");

  // Active tabs state
  const [activeTabs, setActiveTabs] = useState<any[]>([]);
  const [loadingTabs, setLoadingTabs] = useState(false);

  const fetchActiveTabs = async () => {
    if (!store) return;
    setLoadingTabs(true);
    try {
      const response = await fetch(`/api/tabs?storeId=${store.id}&status=OPEN`);
      const data = await response.json();
      setActiveTabs(data);
    } catch (error) {
      console.error("Error fetching tabs:", error);
    } finally {
      setLoadingTabs(false);
    }
  };

  const addTable = async () => {
    if (!store || !tableNumber) return;
    try {
      await fetch("/api/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: store.id,
          number: tableNumber,
          name: tableName,
          seats: tableSeats,
        }),
      });
      queryClient.invalidateQueries({ queryKey: [`tables_${store.id}`] });
      setTableNumber("");
      setTableName("");
      setIsAdding(false);
      alert("Table added!");
    } catch (error) {
      console.error("Error adding table:", error);
      alert("Failed to add table");
    }
  };

  const deleteTable = async (tableId: string) => {
    if (!confirm("Delete this table?")) return;
    try {
      await fetch(`/api/tables/${tableId}`, { method: "DELETE" });
      queryClient.invalidateQueries({ queryKey: [`tables_${store?.id}`] });
    } catch (error) {
      console.error("Error deleting table:", error);
    }
  };

  const addMenuItem = async () => {
    if (!store || !menuName || !menuPrice) return;
    try {
      await fetch("/api/menu-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: store.id,
          name: menuName,
          description: menuDescription,
          price: menuPrice,
          category: menuCategory,
        }),
      });
      queryClient.invalidateQueries({ queryKey: [`menuItems_${store.id}`] });
      setMenuName("");
      setMenuDescription("");
      setMenuPrice("");
      setMenuCategory("");
      setIsAdding(false);
      alert("Menu item added!");
    } catch (error) {
      console.error("Error adding menu item:", error);
      alert("Failed to add menu item");
    }
  };

  // No store state
  if (!store) {
    return (
      <PageLayout maxWidth="4xl">
        <EmptyState
          icon={EmptyStateIcons.store}
          title="No Store Found"
          description="Create a store first to manage tables and menu"
          action={{
            label: "Create Store",
            onClick: () => router.push("/make-store"),
          }}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout maxWidth="4xl">
      {/* Page Title */}
      <div className="w-full mb-6 animate-fade-in-up">
        <h1 className="text-2xl font-bold text-white mb-1">Manage {store.name}</h1>
        <p className="text-gray-400 text-sm">Configure tables, menu, and track active tabs</p>
      </div>

      {/* Tabs */}
      <div className="w-full flex gap-2 mb-6 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
        {[
          { value: "tables", label: "Tables", icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" },
          { value: "menu", label: "Menu", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
          { value: "tabs", label: "Active Tabs", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
        ].map((tab) => (
          <Button
            key={tab.value}
            variant={activeTab === tab.value ? "default" : "outline"}
            onClick={() => {
              setActiveTab(tab.value as TabType);
              setIsAdding(false);
              if (tab.value === "tabs") fetchActiveTabs();
            }}
            className={activeTab === tab.value ? "bg-violet-600 hover:bg-violet-700" : "border-white/10 hover:bg-white/10"}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
            </svg>
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Tables Tab */}
      {activeTab === "tables" && (
        <div className="w-full animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">Tables ({tables?.length || 0})</h3>
            <Button
              onClick={() => setIsAdding(!isAdding)}
              className={isAdding ? "bg-white/10" : "bg-violet-600 hover:bg-violet-700"}
            >
              {isAdding ? "Cancel" : "+ Add Table"}
            </Button>
          </div>

          {isAdding && (
            <div className="card-elevated p-5 mb-4 space-y-4">
              <Input
                placeholder="Table Number"
                type="number"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                className="bg-white/5 border-white/10"
              />
              <Input
                placeholder="Table Name (optional, e.g., 'Window Seat')"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                className="bg-white/5 border-white/10"
              />
              <Input
                placeholder="Seats"
                type="number"
                value={tableSeats}
                onChange={(e) => setTableSeats(e.target.value)}
                className="bg-white/5 border-white/10"
              />
              <Button onClick={addTable} className="bg-violet-600 hover:bg-violet-700">
                Save Table
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tables?.map((table) => (
              <div key={table.id} className="card-elevated p-5 hover-lift">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-bold text-lg text-white">Table {table.number}</h4>
                    {table.name && <p className="text-sm text-gray-400">{table.name}</p>}
                    <p className="text-xs text-gray-500">{table.seats} seats</p>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteTable(table.id)}
                    className="bg-red-500/20 hover:bg-red-500/30 text-red-400"
                  >
                    Delete
                  </Button>
                </div>
                <div className="bg-white p-3 rounded-xl inline-block">
                  <Canvas
                    text={`${typeof window !== 'undefined' ? window.location.origin : ''}/store/${store.id}/table/${table.id}`}
                    options={{
                      type: "image/jpeg",
                      quality: 0.3,
                      errorCorrectionLevel: "M",
                      margin: 2,
                      scale: 3,
                      width: 120,
                      color: { dark: "#7c3aed", light: "#ffffff" },
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">Scan to order at this table</p>
              </div>
            ))}
          </div>

          {(!tables || tables.length === 0) && !isAdding && (
            <EmptyState
              icon={EmptyStateIcons.table}
              title="No tables yet"
              description="Add your first table!"
            />
          )}
        </div>
      )}

      {/* Menu Tab */}
      {activeTab === "menu" && (
        <div className="w-full animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">Menu Items ({menuItems?.length || 0})</h3>
            <Button
              onClick={() => setIsAdding(!isAdding)}
              className={isAdding ? "bg-white/10" : "bg-violet-600 hover:bg-violet-700"}
            >
              {isAdding ? "Cancel" : "+ Add Item"}
            </Button>
          </div>

          {isAdding && (
            <div className="card-elevated p-5 mb-4 space-y-4">
              <Input
                placeholder="Item Name"
                value={menuName}
                onChange={(e) => setMenuName(e.target.value)}
                className="bg-white/5 border-white/10"
              />
              <Input
                placeholder="Description (optional)"
                value={menuDescription}
                onChange={(e) => setMenuDescription(e.target.value)}
                className="bg-white/5 border-white/10"
              />
              <Input
                placeholder="Price (in MOVE)"
                value={menuPrice}
                onChange={(e) => setMenuPrice(e.target.value)}
                className="bg-white/5 border-white/10"
              />
              <Input
                placeholder="Category (e.g., 'Main', 'Drinks')"
                value={menuCategory}
                onChange={(e) => setMenuCategory(e.target.value)}
                className="bg-white/5 border-white/10"
              />
              <Button onClick={addMenuItem} className="bg-violet-600 hover:bg-violet-700">
                Save Item
              </Button>
            </div>
          )}

          <div className="space-y-3">
            {menuItems?.map((item) => (
              <div key={item.id} className="card-elevated p-4 flex justify-between items-center hover-lift">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-white">{item.name}</h4>
                    {item.category && (
                      <Badge variant="outline" className="text-xs border-violet-500/50 text-violet-400">
                        {item.category}
                      </Badge>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-sm text-gray-400">{item.description}</p>
                  )}
                  <p className="text-violet-400 font-medium mt-1">{item.price} MOVE</p>
                </div>
              </div>
            ))}
          </div>

          {(!menuItems || menuItems.length === 0) && !isAdding && (
            <EmptyState
              icon={
                <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              }
              title="No menu items yet"
              description="Add your first item!"
            />
          )}
        </div>
      )}

      {/* Active Tabs */}
      {activeTab === "tabs" && (
        <div className="w-full animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">Active Tabs ({activeTabs.length})</h3>
            <Button
              onClick={fetchActiveTabs}
              disabled={loadingTabs}
              variant="outline"
              className="border-white/10 hover:bg-white/10"
            >
              {loadingTabs ? "Loading..." : "Refresh"}
            </Button>
          </div>

          <div className="space-y-3">
            {activeTabs.map((tab) => (
              <div key={tab.id} className="card-elevated p-4 hover-lift">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-white">
                      {tab.customerName || `${tab.customer.slice(0, 8)}...`}
                    </p>
                    {tab.table && (
                      <p className="text-sm text-gray-400">Table {tab.table.number}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-violet-400">{tab.totalAmount} MOVE</p>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-0">{tab.status}</Badge>
                  </div>
                </div>
                <p className="text-sm text-gray-500">{tab.items.length} items</p>
              </div>
            ))}
          </div>

          {activeTabs.length === 0 && !loadingTabs && (
            <EmptyState
              icon={EmptyStateIcons.tab}
              title="No active tabs"
              description="No active tabs at the moment."
            />
          )}
        </div>
      )}
    </PageLayout>
  );
}
