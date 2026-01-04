"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageLayout } from "@/components/layout";
import { EmptyState, EmptyStateIcons } from "@/components/ui/empty-state";
import { ReservationSuccessModal } from "@/components/ui/reservation-success-modal";
import { RESERVATION_FEE } from "@/lib/constants";
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
import { usePrivy } from "@privy-io/react-auth";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ReservePage() {
  const params = useParams();
  const router = useRouter();
  const { id } = params as { id: string };
  const { user, authenticated } = usePrivy();
  const { data: store } = useStore(id);
  const { sendMOVE, isConnected, getBalance, address } = useWallet();
  const { payTab } = usePayment();

  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [partySize, setPartySize] = useState("2");
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "paying" | "paid">("idle");
  const [balance, setBalance] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successTxHash, setSuccessTxHash] = useState<string | undefined>();

  // Fetch balance on mount
  useEffect(() => {
    if (isConnected) {
      getBalance().then((bal) => {
        if (bal) setBalance(bal.formatted);
      });
    }
  }, [isConnected, getBalance]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authenticated || !address || !store) {
      alert("Please connect your wallet first");
      return;
    }

    if (!customerName || !date || !time) {
      alert("Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    try {
      let txHash: string | undefined;

      if (USE_TEST_WALLET) {
        // Test wallet mode: direct MOVE transfer
        // Step 1: Try to create reservation (will get 402)
        const initialResponse = await fetch("/api/reservations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storeId: store.id,
            customer: address,
            customerName,
            phone,
            date,
            time,
            partySize,
            note,
          }),
        });

        // Handle 402 Payment Required
        if (initialResponse.status === 402) {
          const paymentInfo = await initialResponse.json();
          console.log("Payment required:", paymentInfo);

          setPaymentStatus("paying");

          // Step 2: Send payment to store owner
          txHash = await sendMOVE(store.owner, parseFloat(RESERVATION_FEE));

          if (!txHash) {
            throw new Error("Payment failed");
          }

          setPaymentStatus("paid");

          // Step 3: Retry with payment proof
          const paidResponse = await fetch("/api/reservations", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-payment": txHash,
              "x-payment-recipient": store.owner,
            },
            body: JSON.stringify({
              storeId: store.id,
              customer: address,
              customerName,
              phone,
              date,
              time,
              partySize,
              note,
              paymentTxHash: txHash,
            }),
          });

          if (!paidResponse.ok) {
            throw new Error("Failed to create reservation after payment");
          }
        } else if (initialResponse.ok) {
          // No payment required
        } else {
          throw new Error("Failed to create reservation");
        }
      } else {
        // Privy wallet mode: Create Tab and use X402 gas sponsorship
        console.log("🔐 Using Privy wallet with X402 gas sponsorship for reservation...");

        setPaymentStatus("paying");

        // Step 1: Create a Tab for the reservation fee
        const tab = await api.createTab({
          storeId: store.id,
          tableNumber: 1, // Reservation - default table
        });
        console.log("📋 Created tab for reservation:", tab.id);

        // Step 2: Add reservation fee to the Tab
        await api.addItemToTab(tab.id, {
          name: `Reservation: ${customerName} - ${date} ${time}`,
          price: RESERVATION_FEE,
          quantity: 1,
        });
        console.log("➕ Added reservation fee to tab");

        // Step 3: Pay the Tab using X402 sponsored transaction
        const result = await payTab(tab.id);

        if (!result.success) {
          throw new Error(result.error || "Payment failed");
        }

        txHash = result.txHash;
        setPaymentStatus("paid");
        console.log("✅ Reservation payment successful:", txHash);

        // Step 4: Create the reservation with payment proof
        const reservationResponse = await fetch("/api/reservations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-payment": txHash || "",
            "x-payment-recipient": store.owner,
          },
          body: JSON.stringify({
            storeId: store.id,
            customer: address,
            customerName,
            phone,
            date,
            time,
            partySize,
            note,
            paymentTxHash: txHash,
          }),
        });

        if (!reservationResponse.ok) {
          throw new Error("Failed to create reservation after payment");
        }
      }

      // Show success modal
      setSuccessTxHash(txHash);
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error creating reservation:", error);
      alert("Failed to create reservation. Please try again.");
      setPaymentStatus("idle");
    } finally {
      setIsLoading(false);
    }
  };

  // Generate time slots
  const timeSlots = [];
  for (let hour = 9; hour <= 21; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, "0")}:00`);
    timeSlots.push(`${hour.toString().padStart(2, "0")}:30`);
  }

  // Get minimum date (today)
  const today = new Date().toISOString().split("T")[0];

  const getButtonText = () => {
    if (isLoading) {
      if (paymentStatus === "paying") return "Processing Payment...";
      if (paymentStatus === "paid") return "Confirming Reservation...";
      return "Submitting...";
    }
    return `Reserve (${RESERVATION_FEE} USDC fee)`;
  };

  const handleModalClose = () => {
    setShowSuccessModal(false);
    setSuccessTxHash(undefined);
    setPaymentStatus("idle");
    router.push(`/store/${store?.id}`);
  };

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
    <PageLayout maxWidth="lg">
      {/* Store Info */}
      <div className="w-full card-elevated p-4 mb-6 animate-fade-in-up">
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
            <Image src={store.image} alt={store.name} fill className="object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white truncate">{store.name}</h1>
            <p className="text-sm text-gray-400">{store.menu}</p>
          </div>
        </div>
      </div>

      {/* Reservation Form */}
      <div className="w-full card-elevated p-6 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Make a Reservation
        </h2>

        {/* Payment Info Banner */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-yellow-200">
                A small reservation fee of <strong>{RESERVATION_FEE} USDC</strong> is required.
                This helps prevent no-shows and goes to the store owner.
              </p>
              {isConnected && balance && (
                <p className="text-xs text-yellow-300/80 mt-1">
                  Your balance: {parseFloat(balance).toFixed(4)} USDC
                </p>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Name *</label>
            <Input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Your name"
              required
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-violet-500 focus:ring-violet-500/20"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Phone</label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
              type="tel"
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-violet-500 focus:ring-violet-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Date *</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={today}
                required
                className="bg-white/5 border-white/10 text-white focus:border-violet-500 focus:ring-violet-500/20"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Time *</label>
              <Select value={time} onValueChange={setTime} required>
                <SelectTrigger className="bg-white/5 border-white/10 text-white focus:border-violet-500 focus:ring-violet-500/20">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  <SelectGroup>
                    <SelectLabel className="text-gray-400">Available Times</SelectLabel>
                    {timeSlots.map((slot) => (
                      <SelectItem key={slot} value={slot} className="text-white focus:bg-violet-500/20">
                        {slot}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Party Size *</label>
            <Select value={partySize} onValueChange={setPartySize}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white focus:border-violet-500 focus:ring-violet-500/20">
                <SelectValue placeholder="Number of guests" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                <SelectGroup>
                  <SelectLabel className="text-gray-400">Guests</SelectLabel>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <SelectItem key={num} value={num.toString()} className="text-white focus:bg-violet-500/20">
                      {num} {num === 1 ? "person" : "people"}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Special Requests</label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Any special requests?"
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-violet-500 focus:ring-violet-500/20"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="flex-1 h-12 border-white/10 hover:bg-white/10"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !authenticated || !isConnected}
              className="flex-1 h-12 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 font-semibold"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {getButtonText()}
                </div>
              ) : (
                getButtonText()
              )}
            </Button>
          </div>

          {!isConnected && authenticated && (
            <p className="text-xs text-yellow-400 text-center">
              Please connect a wallet to make a reservation
            </p>
          )}
        </form>
      </div>

      {/* Success Modal */}
      <ReservationSuccessModal
        isOpen={showSuccessModal}
        onClose={handleModalClose}
        txHash={successTxHash}
        reservationDetails={{
          customerName,
          date,
          time,
          partySize,
          storeName: store?.name || "",
        }}
      />
    </PageLayout>
  );
}
