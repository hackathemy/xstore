"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import { PaymentSuccessModal } from "@/components/ui/payment-success-modal";
import { usePrivyWallet } from "@/context/PrivyWalletContext";
import { usePayment } from "@/hooks/usePayment";
import { api } from "@/lib/api";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface OrderSummary {
  storeId: string;
  storeName: string;
  storeOwner?: string;
  items: Array<{ id: string; name: string; price: string; quantity: number; subtotal: string }>;
  totalAmount: string;
}

export interface PaymentInfo {
  tabId: string;
  totalAmount: string;
  storeName: string;
  storeOwner: string;
}

interface ChatResponse {
  message: string;
  stores?: any[];
  menuItems?: any[];
  action?: string;
  orderSummary?: OrderSummary;
  tabId?: string;
  paymentInfo?: PaymentInfo;
}

export default function AIChatPage() {
  const router = useRouter();
  const { address, isConnected } = usePrivyWallet();
  const { payTab } = usePayment();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [stores, setStores] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [cart, setCart] = useState<Array<{ menuItemId: string; name: string; price: string; quantity: number }>>([]);
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successTxHash, setSuccessTxHash] = useState("");
  const [successAmount, setSuccessAmount] = useState("");
  const [successStoreName, setSuccessStoreName] = useState("");

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");

    // Add user message
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await api.aiChat({
        message: userMessage,
        history: messages,
        userAddress: address,
      });

      // Add assistant response
      setMessages(prev => [...prev, { role: "assistant", content: response.message }]);

      // Update stores/menu items if available
      if (response.stores && response.stores.length > 0) {
        setStores(response.stores);
        setMenuItems([]);
        setOrderSummary(null);
      }
      if (response.menuItems && response.menuItems.length > 0) {
        setMenuItems(response.menuItems);
      }
      if (response.orderSummary) {
        setOrderSummary(response.orderSummary);
      }
      // Handle payment ready action (Tab already created by AI)
      if (response.action === "payment_ready" && response.paymentInfo) {
        setPaymentInfo(response.paymentInfo);
        setOrderSummary(null); // Clear order summary since we have payment info now
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, something went wrong. Please try again."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick pay for a store's main item
  const handleQuickPay = async (store: any) => {
    if (!address || !isConnected) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "지갑을 연결해주세요."
      }]);
      return;
    }

    setSelectedStore(store);
    setStores([]); // Clear store list
    setIsProcessingPayment(true);

    setMessages(prev => [...prev, {
      role: "assistant",
      content: `${store.name}에서 ${store.menu} 주문을 처리하고 있습니다... 💳`
    }]);

    try {
      // Create a tab for this order
      const tab = await api.createTab({
        storeId: store.id,
        tableNumber: 1,
      });

      // Add the store's main item
      await api.addItemToTab(tab.id, {
        name: store.menu || "Menu Item",
        price: store.price || "10",
        quantity: 1,
      });

      // Pay directly using X402
      console.log("Processing quick payment for tab:", tab.id);
      const result = await payTab(tab.id);

      if (result.success && result.txHash) {
        setSuccessTxHash(result.txHash);
        setSuccessAmount(store.price || "10");
        setSuccessStoreName(store.name);
        setShowSuccessModal(true);
        setSelectedStore(null);
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `결제가 완료되었습니다! 🎉 ${store.name}에서 주문이 확인되었습니다.`
        }]);
      } else {
        throw new Error(result.error || "Payment failed");
      }
    } catch (error) {
      console.error("Quick pay error:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "결제에 실패했습니다. 다시 시도해주세요."
      }]);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Add item to cart
  const handleAddToCart = (item: any) => {
    const existingItem = cart.find(c => c.menuItemId === item.id);
    if (existingItem) {
      setCart(cart.map(c =>
        c.menuItemId === item.id
          ? { ...c, quantity: c.quantity + 1 }
          : c
      ));
    } else {
      setCart([...cart, {
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        quantity: 1
      }]);
    }

    setMessages(prev => [...prev, {
      role: "assistant",
      content: `${item.name}을(를) 장바구니에 추가했습니다! 🛒`
    }]);
  };

  // Remove item from cart
  const handleRemoveFromCart = (menuItemId: string) => {
    setCart(cart.filter(c => c.menuItemId !== menuItemId));
  };

  // Calculate cart total
  const cartTotal = cart.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0).toFixed(6);

  // Checkout with cart - create tab and pay directly
  const handleCheckoutCart = async () => {
    if (!selectedStore || cart.length === 0 || !address) return;

    setIsProcessingPayment(true);
    try {
      // Create a tab
      const tab = await api.createTab({
        storeId: selectedStore.id,
        tableNumber: 1,
      });

      // Add items to the tab
      for (const item of cart) {
        await api.addItemToTab(tab.id, {
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        });
      }

      // Pay directly using X402
      console.log("Processing payment for tab:", tab.id);
      const result = await payTab(tab.id);

      if (result.success && result.txHash) {
        setSuccessTxHash(result.txHash);
        setSuccessAmount(cartTotal);
        setSuccessStoreName(selectedStore.name);
        setShowSuccessModal(true);
        setCart([]); // Clear cart
        setMenuItems([]); // Clear menu
        setSelectedStore(null);
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `결제가 완료되었습니다! 🎉 ${selectedStore.name}에서 주문이 확인되었습니다.`
        }]);
      } else {
        throw new Error(result.error || "Payment failed");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "결제에 실패했습니다. 다시 시도해주세요."
      }]);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Pay directly with order summary (legacy - for AI-prepared orders)
  const handlePayOrder = async () => {
    if (!orderSummary || !address) return;

    setIsProcessingPayment(true);
    try {
      // Create a tab first
      const tab = await api.createTab({
        storeId: orderSummary.storeId,
        tableNumber: 1,
      });

      // Add items to the tab
      for (const item of orderSummary.items) {
        await api.addItemToTab(tab.id, {
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        });
      }

      // Pay directly using X402
      const result = await payTab(tab.id);

      if (result.success && result.txHash) {
        setSuccessTxHash(result.txHash);
        setSuccessAmount(orderSummary.totalAmount);
        setSuccessStoreName(orderSummary.storeName);
        setShowSuccessModal(true);
        setOrderSummary(null);
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `결제가 완료되었습니다! 🎉 ${orderSummary.storeName}에서 주문이 확인되었습니다.`
        }]);
      } else {
        throw new Error(result.error || "Payment failed");
      }
    } catch (error) {
      console.error("Payment error:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "결제에 실패했습니다. 다시 시도해주세요."
      }]);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Pay directly with AI-created tab (using X402 sponsorship)
  const handlePayNow = async () => {
    if (!paymentInfo || !isConnected) return;

    setIsProcessingPayment(true);
    try {
      console.log("Processing AI payment for tab:", paymentInfo.tabId);
      const result = await payTab(paymentInfo.tabId);

      if (result.success && result.txHash) {
        setSuccessTxHash(result.txHash);
        setSuccessAmount(paymentInfo.totalAmount);
        setSuccessStoreName(paymentInfo.storeName);
        setShowSuccessModal(true);
        setPaymentInfo(null); // Clear payment info after success
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `Payment successful! Your order at ${paymentInfo.storeName} has been completed.`
        }]);
      } else {
        throw new Error(result.error || "Payment failed");
      }
    } catch (error) {
      console.error("Payment error:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, the payment failed. Please try again or navigate to the store page."
      }]);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/30 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-violet-500/20 rounded-full blur-[100px]" />
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-fuchsia-500/20 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col h-screen max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4">
          <Header className="mb-4" />

          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="text-gray-400 hover:text-white p-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">AI Assistant</h1>
                <p className="text-sm text-gray-400">Find stores & order food</p>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
                <svg className="w-10 h-10 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Start a conversation</h2>
              <p className="text-gray-400 max-w-sm mx-auto">
                Ask me to find restaurants, browse menus, or help you order food.
                Try &quot;Find pizza places&quot; or &quot;Show me coffee shops&quot;
              </p>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"
                    : "bg-slate-800/80 text-gray-200 border border-white/10"
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-800/80 border border-white/10 rounded-2xl px-4 py-3">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                  <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Store Results */}
        {stores.length > 0 && (
          <div className="flex-shrink-0 px-6 py-3 border-t border-white/10">
            <p className="text-sm text-gray-400 mb-2">Found {stores.length} stores - 터치해서 바로 결제</p>
            <div className="flex overflow-x-auto gap-3 pb-2">
              {stores.map((store) => (
                <button
                  key={store.id}
                  onClick={() => handleQuickPay(store)}
                  disabled={isProcessingPayment || !isConnected}
                  className="flex-shrink-0 bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 border border-violet-500/30 rounded-xl p-3 min-w-[160px] text-left hover:border-violet-500/70 hover:from-violet-600/30 hover:to-fuchsia-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <p className="font-semibold text-white truncate">{store.name}</p>
                  <p className="text-sm text-gray-300 truncate">{store.menu || "Menu Item"}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-lg font-bold text-violet-400">{store.price || "10"} USDC</span>
                    <span className="text-xs bg-violet-600 text-white px-2 py-1 rounded-full">
                      {isProcessingPayment ? "..." : "결제"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            {!isConnected && (
              <p className="text-xs text-yellow-400 text-center mt-2">지갑을 연결해주세요</p>
            )}
          </div>
        )}

        {/* Menu Items Results - with Add to Cart */}
        {menuItems.length > 0 && !orderSummary && (
          <div className="flex-shrink-0 px-6 py-3 border-t border-white/10">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-400">
                {selectedStore ? `${selectedStore.name} 메뉴` : `Found ${menuItems.length} items`}
              </p>
              {selectedStore && (
                <button
                  onClick={() => {
                    setSelectedStore(null);
                    setMenuItems([]);
                    setCart([]);
                  }}
                  className="text-xs text-gray-500 hover:text-white"
                >
                  다른 가게 찾기
                </button>
              )}
            </div>
            <div className="flex overflow-x-auto gap-3 pb-2">
              {menuItems.map((item) => (
                <div
                  key={item.id}
                  className="flex-shrink-0 bg-slate-800/80 border border-white/10 rounded-xl p-3 min-w-[160px]"
                >
                  <p className="font-semibold text-white truncate">{item.name}</p>
                  <p className="text-sm text-violet-400 mt-1">{item.price} USDC</p>
                  {item.store && (
                    <p className="text-xs text-gray-500 mt-1 truncate">{item.store.name}</p>
                  )}
                  <button
                    onClick={() => handleAddToCart(item)}
                    className="mt-2 w-full text-xs bg-violet-600 hover:bg-violet-700 text-white py-1.5 px-2 rounded-lg transition-colors"
                  >
                    + 담기
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cart Section */}
        {cart.length > 0 && selectedStore && (
          <div className="flex-shrink-0 px-6 py-4 border-t border-white/10 bg-slate-900/50">
            <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🛒</span>
                  <span className="font-semibold text-white">장바구니</span>
                </div>
                <span className="text-sm text-gray-400">{selectedStore.name}</span>
              </div>

              <div className="space-y-2 mb-4 max-h-32 overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.menuItemId} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-300">{item.quantity}x {item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">{(parseFloat(item.price) * item.quantity).toFixed(2)} USDC</span>
                      <button
                        onClick={() => handleRemoveFromCart(item.menuItemId)}
                        className="text-red-400 hover:text-red-300 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-white/10">
                <span className="font-semibold text-white">총 금액</span>
                <span className="text-xl font-bold text-amber-400">{cartTotal} USDC</span>
              </div>

              <Button
                onClick={handleCheckoutCart}
                disabled={!isConnected || isProcessingPayment}
                className="w-full mt-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 font-semibold"
              >
                {isProcessingPayment ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    결제 처리중...
                  </>
                ) : !isConnected ? (
                  "지갑 연결 필요"
                ) : (
                  <>
                    💳 바로 결제하기 ({cartTotal} USDC)
                  </>
                )}
              </Button>

              <p className="text-xs text-gray-500 text-center mt-2">
                X402 가스비 대납 - 수수료 없음
              </p>
            </div>
          </div>
        )}

        {/* Order Summary */}
        {orderSummary && (
          <div className="flex-shrink-0 px-6 py-4 border-t border-white/10 bg-slate-900/50">
            <div className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span className="font-semibold text-white">Order Summary</span>
                </div>
                <span className="text-sm text-gray-400">{orderSummary.storeName}</span>
              </div>

              <div className="space-y-2 mb-4">
                {orderSummary.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-gray-300">{item.quantity}x {item.name}</span>
                    <span className="text-gray-400">{item.subtotal} USDC</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-white/10">
                <span className="font-semibold text-white">Total</span>
                <span className="text-xl font-bold text-emerald-400">{orderSummary.totalAmount} USDC</span>
              </div>

              <Button
                onClick={handlePayOrder}
                disabled={!isConnected || isProcessingPayment}
                className="w-full mt-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 font-semibold"
              >
                {isProcessingPayment ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : !isConnected ? (
                  "Connect Wallet to Pay"
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Proceed to Payment
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Payment Ready - AI has created a Tab, ready to pay */}
        {paymentInfo && (
          <div className="flex-shrink-0 px-6 py-4 border-t border-white/10 bg-slate-900/50">
            <div className="bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="font-semibold text-white">Payment Ready</span>
                </div>
                <span className="text-sm text-gray-400">{paymentInfo.storeName}</span>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-white/10">
                <span className="font-semibold text-white">Total</span>
                <span className="text-xl font-bold text-violet-400">{paymentInfo.totalAmount} USDC</span>
              </div>

              <Button
                onClick={handlePayNow}
                disabled={!isConnected || isProcessingPayment}
                className="w-full mt-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 font-semibold"
              >
                {isProcessingPayment ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing Payment...
                  </>
                ) : !isConnected ? (
                  "Connect Wallet to Pay"
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Pay Now ({paymentInfo.totalAmount} USDC)
                  </>
                )}
              </Button>

              <p className="text-xs text-gray-500 text-center mt-2">
                X402 sponsored transaction - no gas fees for you
              </p>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="flex-shrink-0 px-6 py-4 bg-slate-900/50 border-t border-white/10">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              disabled={isLoading}
              className="flex-1 bg-slate-800/80 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 transition-colors"
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 px-6"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </Button>
          </div>
        </div>
      </div>

      {/* Payment Success Modal */}
      <PaymentSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        txHash={successTxHash}
        amount={successAmount || "0"}
        storeName={successStoreName || "Store"}
      />
    </main>
  );
}
