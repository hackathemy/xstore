"use client";

import { ReactNode } from "react";
import { Header } from "./header";

interface PageLayoutProps {
  children: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "4xl";
  showHeader?: boolean;
  className?: string;
}

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "4xl": "max-w-4xl",
};

export function PageLayout({
  children,
  maxWidth = "lg",
  showHeader = true,
  className = "",
}: PageLayoutProps) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/30 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-violet-500/20 rounded-full blur-[100px]" />
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-fuchsia-500/20 rounded-full blur-[100px]" />
      </div>

      <div className={`relative z-10 flex flex-col items-center px-6 py-8 ${maxWidthClasses[maxWidth]} mx-auto ${className}`}>
        {showHeader && <Header className="mb-6" />}
        {children}
      </div>
    </main>
  );
}

// Centered layout for loading/error states
export function CenteredLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/30 rounded-full blur-[100px]" />
      </div>
      <div className="relative z-10">{children}</div>
    </main>
  );
}
