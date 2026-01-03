"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { TestWalletProvider } from "./TestWalletContext";
import { PrivyWalletProvider } from "./PrivyWalletContext";

const queryClient = new QueryClient();

// Set to false to use Privy wallet with gas sponsorship
// Set to true to use test wallet with hardcoded private key
export const USE_TEST_WALLET = false;

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
        // Privy embedded wallet for signing
        embeddedWallets: {
          createOnLogin: "users-without-wallets",
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        {USE_TEST_WALLET ? (
          <TestWalletProvider>{children}</TestWalletProvider>
        ) : (
          <PrivyWalletProvider>{children}</PrivyWalletProvider>
        )}
      </QueryClientProvider>
    </PrivyProvider>
  );
}
