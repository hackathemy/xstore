"use client";

import { usePrivy } from "@privy-io/react-auth";
import { Button } from "./ui/button";

export function LoginButton() {
  const { ready, authenticated, login, logout, user } = usePrivy();

  if (!ready) {
    return (
      <Button disabled className="bg-white/10 border-white/10">
        <div className="flex items-center gap-2">
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-gray-400">Loading...</span>
        </div>
      </Button>
    );
  }

  if (authenticated && user?.wallet) {
    const address = user.wallet.address;
    const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

    return (
      <Button
        variant="outline"
        onClick={logout}
        className="border-white/20 bg-white/5 hover:bg-white/10 text-white"
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          {shortAddress}
        </div>
      </Button>
    );
  }

  return (
    <Button
      onClick={login}
      className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 font-medium"
    >
      Connect
    </Button>
  );
}
