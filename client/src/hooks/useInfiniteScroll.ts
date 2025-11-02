import { useEffect, useRef, useCallback } from 'react';

/**
 * useInfiniteScroll Hook
 * 
 * Implements infinite scroll functionality with intersection observer
 * 
 * @param callback - Function to call when reaching the bottom
 * @param hasMore - Whether there are more items to load
 * @param isLoading - Whether currently loading
 * @param threshold - Distance from bottom to trigger load (default: 0.8)
 */
export function useInfiniteScroll(
  callback: () => void,
  hasMore: boolean,
  isLoading: boolean,
  threshold: number = 0.8
) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      
      if (entry.isIntersecting && hasMore && !isLoading) {
        callback();
      }
    },
    [callback, hasMore, isLoading]
  );

  useEffect(() => {
    const element = loadMoreRef.current;
    
    if (!element) return;

    // Create observer
    observerRef.current = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '100px', // Start loading 100px before reaching the element
      threshold,
    });

    // Observe the element
    observerRef.current.observe(element);

    // Cleanup
    return () => {
      if (observerRef.current && element) {
        observerRef.current.unobserve(element);
      }
    };
  }, [handleObserver, threshold]);

  return loadMoreRef;
}

