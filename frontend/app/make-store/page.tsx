"use client";

import { MakeStore } from "@/components/make-store";
import { PageLayout } from "@/components/layout";

export default function MakeStorePage() {
  return (
    <PageLayout maxWidth="md">
      {/* Page Title */}
      <div className="w-full text-center mb-8 animate-fade-in-up">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Create Your Store</h1>
        <p className="text-gray-400">
          Set up your store and start accepting crypto payments
        </p>
      </div>

      {/* Form Card */}
      <div className="w-full card-elevated p-6 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
        <MakeStore />
      </div>
    </PageLayout>
  );
}
