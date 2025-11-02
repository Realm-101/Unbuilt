import { useEffect, useRef, useState } from 'react';

export interface PullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  resistance?: number;
  enabled?: boolean;
}

/**
 * Hook for implementing pull-to-refresh functionality on mobile
 * 
 * @param options - Configuration options
 * @returns Ref to attach to scrollable container
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  resistance = 2.5,
  enabled = true,
}: PullToRefreshOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  
  const touchStartY = useRef(0);
  const touchCurrentY = useRef(0);
  const isDragging = useRef(false);
  
  useEffect(() => {
    if (!enabled || !containerRef.current) return;
    
    const container = containerRef.current;
    
    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger if at top of scroll
      if (container.scrollTop === 0) {
        touchStartY.current = e.touches[0].clientY;
        isDragging.current = true;
      }
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging.current || isRefreshing) return;
      
      touchCurrentY.current = e.touches[0].clientY;
      const diff = touchCurrentY.current - touchStartY.current;
      
      // Only pull down
      if (diff > 0 && container.scrollTop === 0) {
        // Apply resistance
        const distance = Math.min(diff / resistance, threshold * 1.5);
        setPullDistance(distance);
        
        // Prevent default scroll behavior when pulling
        if (distance > 10) {
          e.preventDefault();
        }
      }
    };
    
    const handleTouchEnd = async () => {
      if (!isDragging.current) return;
      
      isDragging.current = false;
      
      // Trigger refresh if pulled past threshold
      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true);
        setPullDistance(threshold);
        
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        // Snap back
        setPullDistance(0);
      }
    };
    
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, threshold, resistance, onRefresh, isRefreshing, pullDistance]);
  
  return {
    containerRef,
    isRefreshing,
    pullDistance,
    isPulling: pullDistance > 0,
  };
}
