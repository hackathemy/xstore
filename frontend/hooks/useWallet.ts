"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useCallback, useMemo } from "react";
import { createPublicClient, http, parseEther, formatEther } from "viem";
import { hardhatLocal, movementTestnet } from "@/lib/chains";

// Movement Network (MEVM) - EVM 호환 레이어
// 개발: hardhatLocal, 프로덕션: movementTestnet
const isDev = process.env.NODE_ENV === "development";
const activeChain = isDev ? hardhatLocal : movementTestnet;

const publicClient = createPublicClient({
  chain: activeChain,
  transport: http(),
});

export function useWallet() {
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();

  const address = user?.wallet?.address;
  const isConnected = authenticated && !!address;

  const wallet = useMemo(() => {
    return wallets.find((w) => w.address === address);
  }, [wallets, address]);

  const getBalance = useCallback(async () => {
    if (!address) return null;

    try {
      const balance = await publicClient.getBalance({
        address: address as `0x${string}`,
      });

      return {
        value: balance,
        formatted: formatEther(balance),
        decimals: 18,
        symbol: activeChain.nativeCurrency.symbol, // MOVE or ETH
      };
    } catch (error) {
      console.error("Error fetching balance:", error);
      return null;
    }
  }, [address]);

  const sendMOVE = useCallback(
    async (to: string, amount: number) => {
      if (!wallet || !address) {
        throw new Error("Wallet not connected");
      }

      try {
        const provider = await wallet.getEthereumProvider();
        const amountInWei = parseEther(amount.toString());

        const txHash = await provider.request({
          method: "eth_sendTransaction",
          params: [
            {
              from: address,
              to: to as `0x${string}`,
              value: `0x${amountInWei.toString(16)}`,
            },
          ],
        });

        return txHash as string;
      } catch (error) {
        console.error("Error sending MOVE:", error);
        throw error;
      }
    },
    [wallet, address]
  );

  return {
    ready,
    isConnected,
    address,
    getBalance,
    sendMOVE,
  };
}
