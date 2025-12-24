"use client";

import { useRouter } from "next/navigation";
import { LoginButton } from "@/components/login-button";

interface HeaderProps {
  className?: string;
}

export function Header({ className = "" }: HeaderProps) {
  const router = useRouter();

  return (
    <header className={`w-full flex items-center justify-between animate-fade-in ${className}`}>
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => router.push("/")}
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
          <span className="text-white font-bold text-lg">X</span>
        </div>
        <span className="text-2xl font-bold text-white">Store</span>
      </div>
      <LoginButton />
    </header>
  );
}
