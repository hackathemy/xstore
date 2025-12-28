"use client";

interface LoadingSkeletonProps {
  variant?: "card" | "list" | "detail" | "grid";
  count?: number;
}

function SkeletonCard({ index }: { index: number }) {
  return (
    <div
      key={index}
      className="card-elevated p-4 animate-pulse"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="h-5 bg-white/10 rounded w-24" />
        <div className="h-5 bg-violet-500/20 rounded w-20" />
      </div>
      <div className="h-4 bg-white/5 rounded w-32 mt-2" />
    </div>
  );
}

function SkeletonList({ index }: { index: number }) {
  return (
    <div
      key={index}
      className="card-elevated p-5 animate-pulse"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="h-6 bg-white/10 rounded w-32 mb-2" />
          <div className="h-4 bg-white/5 rounded w-24" />
        </div>
        <div className="h-6 bg-yellow-500/20 rounded w-20" />
      </div>
      <div className="grid grid-cols-4 gap-4 mt-4">
        {[1, 2, 3, 4].map((j) => (
          <div key={j} className="h-12 bg-white/5 rounded" />
        ))}
      </div>
    </div>
  );
}

function SkeletonGrid({ index }: { index: number }) {
  return (
    <div
      key={index}
      className="card-elevated overflow-hidden animate-pulse"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="h-48 bg-white/5" />
      <div className="p-4">
        <div className="h-5 bg-white/10 rounded w-3/4 mb-2" />
        <div className="h-4 bg-white/5 rounded w-1/2" />
      </div>
    </div>
  );
}

function SkeletonDetail() {
  return (
    <div className="w-full animate-pulse">
      <div className="card-elevated p-5 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/10 rounded-xl" />
          <div className="flex-1">
            <div className="h-6 bg-white/10 rounded w-32 mb-2" />
            <div className="h-4 bg-white/5 rounded w-24" />
          </div>
        </div>
      </div>
      <div className="card-elevated p-5">
        <div className="h-5 bg-white/10 rounded w-24 mb-4" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex justify-between items-center py-3 border-b border-white/5 last:border-0">
            <div>
              <div className="h-5 bg-white/10 rounded w-32 mb-1" />
              <div className="h-3 bg-white/5 rounded w-20" />
            </div>
            <div className="h-5 bg-violet-500/20 rounded w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function LoadingSkeleton({ variant = "card", count = 4 }: LoadingSkeletonProps) {
  if (variant === "detail") {
    return <SkeletonDetail />;
  }

  const items = Array.from({ length: count }, (_, i) => i);

  if (variant === "grid") {
    return (
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in-up">
        {items.map((i) => (
          <SkeletonGrid key={i} index={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="w-full space-y-3 animate-fade-in-up">
      {items.map((i) =>
        variant === "list" ? <SkeletonList key={i} index={i} /> : <SkeletonCard key={i} index={i} />
      )}
    </div>
  );
}

// Simple loading spinner with optional text
export function LoadingSpinner({ size = "md", text }: { size?: "sm" | "md" | "lg"; text?: string }) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const spinner = (
    <svg className={`animate-spin ${sizeClasses[size]}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  if (!text) {
    return spinner;
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      {spinner}
      <p className="text-gray-400 text-sm">{text}</p>
    </div>
  );
}

// Full page loading state
export function PageLoading({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
      <div className="animate-pulse text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-white/10 flex items-center justify-center">
          <LoadingSpinner size="md" />
        </div>
        <p className="text-gray-400">{message}</p>
      </div>
    </div>
  );
}
