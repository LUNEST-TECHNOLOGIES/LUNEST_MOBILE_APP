/**
 * useCachedFetch — stale-while-revalidate hook for React Native screens
 *
 * Usage:
 *   const { data, loading, refreshing, onRefresh } = useCachedFetch(
 *     'home:exploreListings',       // unique cache key
 *     fetchExploreListingsFromAPI,   // async () => data
 *     { revalidateOnFocus: true, staleTTL: 60_000 }
 *   );
 *
 * Behaviour:
 *  • First load  → loading = true, data = null (show skeleton)
 *  • Subsequent navigations back → data shown instantly from cache,
 *    background refresh happens silently (no spinner)
 *  • Pull-to-refresh → refreshing = true (normal RefreshControl UX)
 *  • staleTTL (default 60s) — if cache is younger than this, skip
 *    background refetch on focus entirely (saves bandwidth)
 */

import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";

// In-memory cache shared across all hook instances
const _cache = {};

/**
 * @param {string}   key       Unique identifier for this data set
 * @param {Function} fetcher   Async function that returns the data
 * @param {object}   opts
 * @param {boolean}  opts.revalidateOnFocus  Re-fetch when screen regains focus (default true)
 * @param {number}   opts.staleTTL           Milliseconds before cache is considered stale (default 60 000)
 * @param {boolean}  opts.enabled            Set to false to disable auto-fetching (default true)
 */
export default function useCachedFetch(key, fetcher, opts = {}) {
  const {
    revalidateOnFocus = true,
    staleTTL = 60_000,
    enabled = true,
  } = opts;

  const cached = _cache[key];
  const [data, setData] = useState(cached?.data ?? null);
  const [loading, setLoading] = useState(!cached?.data); // only true on first load
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  // Keep fetcher ref up-to-date so callers don't need to memoize
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Core fetch logic
  const execute = useCallback(
    async ({ isRefresh = false, force = false } = {}) => {
      if (!enabled) return;

      const now = Date.now();
      const entry = _cache[key];

      // If cache is fresh and this is just a focus revalidation, skip
      if (!force && !isRefresh && entry?.timestamp && now - entry.timestamp < staleTTL) {
        // Data is still fresh — no network call needed
        return;
      }

      // On the very first load (no cached data), show loading skeleton
      if (!entry?.data && !isRefresh) {
        setLoading(true);
      }

      try {
        const result = await fetcherRef.current();

        if (!mountedRef.current) return; // component unmounted

        // Update cache
        _cache[key] = { data: result, timestamp: Date.now() };

        setData(result);
        setError(null);
      } catch (err) {
        if (!mountedRef.current) return;
        console.error(`[useCachedFetch:${key}] Error:`, err);
        setError(err);
        // Don't clear existing data on background error —
        // user keeps seeing stale data with a silent failure
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [key, staleTTL, enabled],
  );

  // Initial fetch on mount
  useEffect(() => {
    execute();
  }, [execute]);

  // Re-fetch on screen focus (stale-while-revalidate)
  useFocusEffect(
    useCallback(() => {
      if (revalidateOnFocus) {
        execute(); // will skip if cache is fresh
      }
    }, [execute, revalidateOnFocus]),
  );

  // Pull-to-refresh handler (for RefreshControl)
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await execute({ isRefresh: true, force: true });
  }, [execute]);

  // Manual re-fetch (e.g. after a mutation)
  const mutate = useCallback(
    (newData) => {
      if (newData !== undefined) {
        // Optimistic update — set cache + state immediately
        _cache[key] = { data: newData, timestamp: Date.now() };
        setData(newData);
      } else {
        // Trigger a fresh fetch
        execute({ force: true });
      }
    },
    [key, execute],
  );

  // Invalidate cache without refetching (useful for cross-screen coordination)
  const invalidate = useCallback(() => {
    if (_cache[key]) {
      _cache[key].timestamp = 0; // mark as stale
    }
  }, [key]);

  return {
    data,
    loading,       // true only on FIRST load (no cached data)
    refreshing,    // true during pull-to-refresh
    error,
    onRefresh,     // pass to RefreshControl
    refresh: onRefresh, // alias for convenience
    mutate,        // optimistic update or force refetch
    invalidate,    // mark cache stale for next focus
  };
}

/**
 * Utility to invalidate a specific cache key from outside a component.
 * Useful when Screen A modifies data that Screen B is caching.
 *
 * Example: bookmarkService.toggle() → invalidateCache('home:exploreListings')
 */
export function invalidateCache(key) {
  if (_cache[key]) {
    _cache[key].timestamp = 0;
  }
}

/**
 * Utility to clear all cached data.
 * Call on logout so the next user gets a fresh experience.
 */
export function clearAllCache() {
  Object.keys(_cache).forEach((k) => delete _cache[k]);
}
