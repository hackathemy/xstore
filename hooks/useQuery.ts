import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { fetcherWithDefault } from "@/lib/api";

interface QueryConfig<T> {
  queryKey: string | string[];
  url: string | ((params: Record<string, string | undefined>) => string);
  defaultValue?: T;
  enabled?: boolean;
  refetchInterval?: number;
}

/**
 * Generic query hook factory
 * Creates a hook that fetches data from an API endpoint
 */
export function createQueryHook<T, P extends Record<string, string | undefined> = Record<string, never>>(
  config: QueryConfig<T>
) {
  return function useCustomQuery(params?: P, options?: Partial<UseQueryOptions<T>>) {
    const url = typeof config.url === "function" ? config.url(params || {} as P) : config.url;
    const queryKey = Array.isArray(config.queryKey)
      ? [...config.queryKey, params]
      : [config.queryKey, params];

    return useQuery<T>({
      queryKey,
      queryFn: async () => {
        if (config.defaultValue !== undefined) {
          return fetcherWithDefault(url, config.defaultValue);
        }
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch ${url}`);
        return response.json();
      },
      enabled: config.enabled ?? true,
      refetchInterval: config.refetchInterval,
      ...options,
    });
  };
}

/**
 * Simple fetch hook for single resources by ID
 */
export function useFetch<T>(
  key: string,
  url: string | null,
  options?: { enabled?: boolean; refetchInterval?: number; defaultValue?: T | null }
) {
  return useQuery<T | null>({
    queryKey: [key],
    queryFn: async (): Promise<T | null> => {
      if (!url) return options?.defaultValue ?? null;
      const response = await fetch(url);
      if (!response.ok) return options?.defaultValue ?? null;
      return response.json();
    },
    enabled: options?.enabled ?? !!url,
    refetchInterval: options?.refetchInterval,
  });
}
