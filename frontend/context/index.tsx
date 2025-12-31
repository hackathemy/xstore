"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { TestWalletProvider } from "./TestWalletContext";

const queryClient = new QueryClient();

// Set to true to use test wallet instead of Privy
// Currently using test wallet as Privy Movement integration is in progress
export const USE_TEST_WALLET = true;

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#3b82f6",
          logo: "/xstore.svg",
        },
        loginMethods: ["email", "wallet", "google"],
        // Movement Network uses Move Native, not EVM
        // Privy wallet integration pending - using test wallet for now
        embeddedWallets: {
          createOnLogin: "users-without-wallets",
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        {USE_TEST_WALLET ? (
          <TestWalletProvider>{children}</TestWalletProvider>
        ) : (
          children
        )}
      </QueryClientProvider>
    </PrivyProvider>
  );
}
