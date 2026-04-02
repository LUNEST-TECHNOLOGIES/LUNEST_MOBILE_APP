import { useEffect, useState, useRef } from 'react';

/**
 * useDelayedLoading - Delays showing loading state to prevent flash for fast loads
 * 
 * Best Practice: If content loads in < 300ms, skip skeleton entirely
 * If load takes longer, show skeleton after delay
 * 
 * @param isLoading - Actual loading state from data fetch
 * @param delayMs - Delay before showing skeleton (default 300ms)
 * @returns boolean - Whether to show skeleton (delayed)
 */
export const useDelayedLoading = (isLoading, delayMs = 300) => {
  const [showSkeleton, setShowSkeleton] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isLoading) {
      // Start timer when loading begins
      timerRef.current = setTimeout(() => {
        setShowSkeleton(true);
      }, delayMs);
    } else {
      // Clear timer and hide skeleton when loading completes
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setShowSkeleton(false);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isLoading, delayMs]);

  return showSkeleton;
};

/**
 * useFirstLoad - Distinguishes between first load and subsequent refreshes
 * 
 * First load: Show skeleton
 * Refresh: Show spinner overlay on existing content
 * 
 * @param data - Data array/object
 * @param isLoading - Loading state
 * @returns { isFirstLoad, isRefreshing }
 */
export const useFirstLoad = (data, isLoading) => {
  const hasLoadedRef = useRef(false);
  const [isFirstLoad, setIsFirstLoad] = useState(!data);

  useEffect(() => {
    if (data && !isLoading) {
      hasLoadedRef.current = true;
      setIsFirstLoad(false);
    }
  }, [data, isLoading]);

  const isRefreshing = isLoading && hasLoadedRef.current;

  return { isFirstLoad, isRefreshing };
};

/**
 * useProgressiveLoading - Combines delayed skeleton + first load detection
 * 
 * Usage:
 * const { showSkeleton, isRefreshing, contentReady } = useProgressiveLoading(
 *   listings, 
 *   loading, 
 *   { skeletonDelay: 300 }
 * );
 */
export const useProgressiveLoading = (
  data,
  isLoading,
  options = {}
) => {
  const { skeletonDelay = 300 } = options;
  
  const { isFirstLoad, isRefreshing } = useFirstLoad(data, isLoading);
  const showSkeleton = useDelayedLoading(isLoading && isFirstLoad, skeletonDelay);
  const contentReady = !!data && !isLoading;

  return {
    showSkeleton,      // true only after delay on first load
    isRefreshing,      // true when refreshing existing data
    contentReady,      // true when data is available
    isFirstLoad,        // true only on initial load
  };
};

export default useDelayedLoading;
