"use client";

import { Button } from "@/components/ui/button";
import { PageLayout } from "@/components/layout";
import { EmptyState, EmptyStateIcons } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import useStores from "@/hooks/useStores";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function StoresPage() {
  const router = useRouter();
  const { data: stores, isLoading } = useStores();

  return (
    <PageLayout maxWidth="4xl">
      {/* Page Title */}
      <div className="w-full mb-8 animate-fade-in-up">
        <h1 className="text-3xl font-bold text-white mb-2">Browse Stores</h1>
        <p className="text-gray-400">Discover and order from local stores</p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card-elevated p-0 overflow-hidden animate-pulse">
              <div className="h-48 bg-white/5" />
              <div className="p-5">
                <div className="h-6 bg-white/10 rounded mb-3" />
                <div className="h-4 bg-white/5 rounded mb-4 w-3/4" />
                <div className="flex justify-between">
                  <div className="h-4 bg-white/5 rounded w-1/4" />
                  <div className="h-4 bg-violet-500/20 rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && (!stores || stores.length === 0) && (
        <EmptyState
          icon={EmptyStateIcons.store}
          title="No stores yet"
          description="Be the first to create a store on XStore"
          action={{
            label: "Create Your Store",
            onClick: () => router.push("/make-store"),
          }}
        />
      )}

      {/* Store Grid */}
      {!isLoading && stores && stores.length > 0 && (
        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stores.map((store, index) => (
            <div
              key={store.id}
              className="card-elevated overflow-hidden hover-lift cursor-pointer group animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
              onClick={() => router.push(`/store/${store.id}`)}
            >
              {/* Image */}
              <div className="relative h-48 w-full overflow-hidden">
                {store.image && !store.image.includes('example.com') ? (
                  <Image
                    src={store.image}
                    alt={store.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center">
                    <span className="text-6xl">🏪</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>

              {/* Content */}
              <div className="p-5">
                <h2 className="text-lg font-bold text-white truncate mb-1">
                  {store.name}
                </h2>
                <p className="text-sm text-gray-400 truncate mb-4">
                  {store.description}
                </p>

                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-gray-500">{store.menu}</span>
                  <span className="text-violet-400 font-bold">{store.price} MOVE</span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-violet-600 hover:bg-violet-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/store/${store.id}`);
                    }}
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    Order
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-white/10 hover:bg-white/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/store/${store.id}/reserve`);
                    }}
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Reserve
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
