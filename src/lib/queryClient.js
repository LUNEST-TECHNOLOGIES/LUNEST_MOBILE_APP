import { QueryClient } from "@tanstack/react-query";

/**
 * Global Query Client for TanStack Query
 * Configured with optimized defaults for a premium mobile experience
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 5 minutes stale time (don't refetch too often)
      staleTime: 1000 * 60 * 5,
      // Cache for 24 hours (for persistence)
      gcTime: 1000 * 60 * 60 * 24,
      // Auto-retry once on failure
      retry: 1,
      // Refetch on focus (screen visit)
      refetchOnWindowFocus: true,
      // Smooth loading transition
      placeholderData: (prev) => prev,
    },
  },
});
