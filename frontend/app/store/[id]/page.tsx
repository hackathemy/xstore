"use client";

import { Button } from "@/components/ui/button";
import { PageLayout } from "@/components/layout";
import { EmptyState, EmptyStateIcons } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useStore from "@/hooks/useStore";
import { useWallet } from "@/hooks/useWallet";
import { usePayment } from "@/hooks/usePayment";
import { USE_TEST_WALLET } from "@/context";
import { api } from "@/lib/api";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function StorePage() {
  const params = useParams();
  const router = useRouter();
  const { id } = params as { id: string };
  const { address, isConnected, getBalance, sendMOVE } = useWallet();
  const { payTab } = usePayment();
  const { data: store } = useStore(id);
  const [count, setCount] = useState("1");
  const [tip, setTip] = useState("10");
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isConnected) {
      getBalance().then((bal) => {
        if (bal) setBalance(bal.formatted);
      });
    }
  }, [isConnected, getBalance]);

  const totalPrice = useMemo(() => {
    if (!store) return 0;
    const basePrice = +store.price;
    const cnt = +count;
    const percent = +tip;
    return basePrice * cnt + (basePrice * cnt * percent) / 100;
  }, [store, count, tip]);

  const onSendTransaction = useCallback(async () => {
    if (!store || !isConnected) return;

    setIsLoading(true);
    try {
      let hash: string | undefined;

      if (USE_TEST_WALLET) {
        // Test wallet mode: direct MOVE transfer
        hash = await sendMOVE(store.owner, totalPrice);

        await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storeId: store.id,
            count,
            price: totalPrice.toString(),
            customer: address,
            hash,
          }),
        });
      } else {
        // Privy wallet mode: Create Tab and use X402 gas sponsorship
        console.log("🔐 Using Privy wallet with X402 gas sponsorship...");

        // Step 1: Create a Tab for this order
        const tab = await api.createTab({
          storeId: store.id,
          tableNumber: 1, // Quick order - default table
        });
        console.log("📋 Created tab:", tab.id);

        // Step 2: Add the item(s) to the Tab
        await api.addItemToTab(tab.id, {
          name: store.menu,
          price: store.price,
          quantity: parseInt(count),
        });
        console.log("➕ Added item to tab");

        // Step 3: Pay the Tab using X402 sponsored transaction
        const result = await payTab(tab.id);

        if (!result.success) {
          throw new Error(result.error || "Payment failed");
        }

        hash = result.txHash;
        console.log("✅ Payment successful:", hash);
      }

      alert("Order Success!");
    } catch (error) {
      console.error("Transaction failed:", error);
      alert("Transaction failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [sendMOVE, payTab, address, store, count, isConnected, totalPrice]);

  if (!store) {
    return (
      <PageLayout maxWidth="md">
        <EmptyState
          icon={EmptyStateIcons.notFound}
          title="Store Not Found"
          description="This store doesn't exist or has been removed"
          action={{
            label: "Browse Stores",
            onClick: () => router.push("/stores"),
          }}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout maxWidth="md">
      <div className="w-full space-y-6 animate-fade-in-up">
        {/* Store Image */}
        <div className="relative w-full h-64 rounded-2xl overflow-hidden">
          <Image
            src={store.image}
            fill
            alt={store.name}
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <h1 className="text-2xl font-bold text-white">{store.name}</h1>
            <p className="text-gray-300 text-sm">{store.description}</p>
          </div>
        </div>

        {/* Menu Card */}
        <div className="card-elevated p-5">
          <div className="flex items-center gap-2 mb-4">
            <svg
              className="w-5 h-5 text-violet-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <h2 className="text-lg font-semibold text-white">Menu</h2>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">{store.menu}</span>
            <span className="text-violet-400 font-bold text-lg">
              {store.price} USDC
            </span>
          </div>
        </div>

        {/* Order Options */}
        <div className="card-elevated p-5 space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <svg
              className="w-5 h-5 text-violet-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            Order Options
          </h2>

          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Quantity
              </label>
              <Select value={count} onValueChange={setCount}>
                <SelectTrigger className="w-full bg-white/5 border-white/10">
                  <SelectValue placeholder="Count" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Quantity</SelectLabel>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Tip</label>
              <Select value={tip} onValueChange={setTip}>
                <SelectTrigger className="w-full bg-white/5 border-white/10">
                  <SelectValue placeholder="Tip" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Tip Amount</SelectLabel>
                    <SelectItem value="0">No tip</SelectItem>
                    <SelectItem value="10">10%</SelectItem>
                    <SelectItem value="15">15%</SelectItem>
                    <SelectItem value="20">20%</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Total & Actions */}
        <div className="card-elevated p-5">
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-400">Total</span>
            <span className="text-2xl font-bold gradient-text">
              {totalPrice} USDC
            </span>
          </div>

          {isConnected && balance && (
            <p className="text-sm text-gray-500 mb-4 text-center">
              Your balance: {parseFloat(balance).toFixed(4)} USDC
            </p>
          )}

          <div className="flex gap-3">
            <Button
              onClick={onSendTransaction}
              disabled={isLoading || !isConnected}
              className="flex-1 h-12 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 font-semibold"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <svg
                    className="animate-spin w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Processing...
                </div>
              ) : (
                "Order Now"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/store/${id}/reserve`)}
              className="h-12 border-white/10 hover:bg-white/10"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              Reserve
            </Button>
          </div>

          {!isConnected && (
            <p className="text-sm text-yellow-400 text-center mt-3">
              Connect wallet to place order
            </p>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
