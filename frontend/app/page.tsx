"use client";
import { Button } from "@/components/ui/button";
import { LoginButton } from "@/components/login-button";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQRCode } from "next-qrcode";
import { usePrivy } from "@privy-io/react-auth";
import useMyStore from "@/hooks/useMyStore";

export default function Home() {
  const router = useRouter();
  const { Canvas } = useQRCode();
  const { user, authenticated } = usePrivy();
  const address = user?.wallet?.address;
  const { data: store } = useMyStore(address);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/30 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-violet-500/20 rounded-full blur-[100px]" />
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-fuchsia-500/20 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center px-6 py-8 max-w-md mx-auto">
        {/* Header */}
        <header className="w-full flex items-center justify-between mb-8 animate-fade-in">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <span className="text-white font-bold text-lg">X</span>
            </div>
            <span className="text-2xl font-bold text-white">Store</span>
          </div>
          <LoginButton />
        </header>

        {/* Quick Actions */}
        <div className="w-full space-y-3 mb-8 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          <Button
            onClick={() => router.push("/stores")}
            variant="outline"
            className="w-full h-12 bg-white/5 border-white/10 hover:bg-white/10 hover:border-violet-500/50 transition-all duration-300"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Browse All Stores
          </Button>
          {authenticated && (
            <>
              <Button
                onClick={() => router.push("/my-tabs")}
                variant="outline"
                className="w-full h-12 bg-white/5 border-white/10 hover:bg-white/10 hover:border-violet-500/50 transition-all duration-300"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                My Tabs
              </Button>
              <Button
                onClick={() => router.push("/charge")}
                variant="outline"
                className="w-full h-12 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30 hover:bg-green-500/20 hover:border-green-500/50 transition-all duration-300"
              >
                <svg className="w-5 h-5 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-green-400">TUSDC Faucet</span>
              </Button>
            </>
          )}
          <Button
            onClick={() => router.push("/chat")}
            variant="outline"
            className="w-full h-12 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border-violet-500/30 hover:bg-violet-500/20 hover:border-violet-500/50 transition-all duration-300"
          >
            <svg className="w-5 h-5 mr-2 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span className="text-violet-400">AI Assistant</span>
          </Button>
        </div>

        {/* Store Owner Dashboard */}
        {authenticated && store && (
          <div className="w-full space-y-6 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            {/* Dashboard Card */}
            <div className="card-elevated p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Dashboard</h2>
                  <p className="text-sm text-gray-400">Manage your store</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => router.push("/order")}
                  className="h-12 bg-violet-600 hover:bg-violet-700 transition-all duration-300"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  Orders
                </Button>
                <Button
                  onClick={() => router.push("/reservations")}
                  variant="secondary"
                  className="h-12 bg-white/10 hover:bg-white/20 transition-all duration-300"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Reservations
                </Button>
                <Button
                  onClick={() => router.push("/manage")}
                  variant="outline"
                  className="h-12 col-span-2 bg-white/5 border-white/10 hover:bg-white/10 hover:border-violet-500/50 transition-all duration-300"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Manage Tables & Menu
                </Button>
              </div>
            </div>

            {/* QR Code Card */}
            <div className="card-elevated p-6">
              <h3 className="text-md font-semibold text-white mb-1">Store QR Code</h3>
              <p className="text-sm text-gray-400 mb-4">Share with customers</p>
              <div className="flex justify-center">
                <div className="p-3 bg-white rounded-2xl">
                  <Canvas
                    text={`${typeof window !== 'undefined' ? window.location.origin : ''}/store/${store.id}`}
                    options={{
                      type: "image/jpeg",
                      quality: 0.3,
                      errorCorrectionLevel: "M",
                      margin: 2,
                      scale: 4,
                      width: 160,
                      color: { dark: "#7c3aed", light: "#ffffff" },
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Store Info Card */}
            <div className="card-elevated p-6">
              <div className="flex gap-4">
                <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                  <Image src={store.image} fill alt={store.name} className="object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-white truncate">{store.name}</h3>
                  <p className="text-sm text-gray-400 line-clamp-2">{store.description}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm text-gray-500">{store.menu}</span>
                    <span className="text-violet-400 font-medium">{store.price} USDC</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Landing - Not Authenticated */}
        {!authenticated && (
          <div className="w-full text-center animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            {/* Hero */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-white mb-4">
                Cardless
                <span className="gradient-text"> Crypto </span>
                Payments
              </h1>
              <p className="text-gray-400 text-lg">
                Accept payments with x402 protocol. No cards needed.
              </p>
            </div>

            {/* Features */}
            <div className="card-elevated p-6 text-left mb-8">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                How it works
              </h3>
              <div className="space-y-4">
                {[
                  { icon: "🏪", title: "Create Store", desc: "Set up your store in seconds with Privy" },
                  { icon: "📱", title: "QR Tables", desc: "Generate QR codes for each table" },
                  { icon: "💳", title: "Tab System", desc: "Customers order & pay at the end" },
                  { icon: "⚡", title: "x402 Payments", desc: "Seamless crypto with USDC stablecoin" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                      <span className="text-xl">{item.icon}</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-white">{item.title}</h4>
                      <p className="text-sm text-gray-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <Button
              onClick={() => router.push("/make-store")}
              size="lg"
              className="w-full h-14 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-lg font-semibold transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-violet-500/25"
            >
              Create Your Store
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Button>
          </div>
        )}

        {/* Authenticated but no store */}
        {authenticated && !store && (
          <div className="w-full text-center animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center animate-float">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-3">
              Start Your Store
            </h1>
            <p className="text-gray-400 mb-8">
              Create a store in seconds and start accepting crypto payments
            </p>
            <Button
              onClick={() => router.push("/make-store")}
              size="lg"
              className="w-full h-14 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-lg font-semibold transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-violet-500/25"
            >
              Make Store
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Button>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 text-center text-gray-500 text-sm animate-fade-in">
          <p>Powered by Movement Network</p>
        </footer>
      </div>
    </main>
  );
}
