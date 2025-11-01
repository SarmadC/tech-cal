'use client';

import { useRef, useState, useCallback } from 'react';

interface PullToRefreshConfig {
  onRefresh: () => Promise<void>;
  threshold?: number;
  resistance?: number;
  enabled?: boolean;
}

interface PullState {
  isPulling: boolean;
  isRefreshing: boolean;
  pullDistance: number;
  canRefresh: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  resistance = 2.5,
  enabled = true,
}: PullToRefreshConfig) {
  const [pullState, setPullState] = useState<PullState>({
    isPulling: false,
    isRefreshing: false,
    pullDistance: 0,
    canRefresh: false,
  });

  const startY = useRef<number>(0);
  const scrollElement = useRef<HTMLElement | null>(null);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || pullState.isRefreshing) return;

      const element = e.currentTarget as HTMLElement;
      if (!element) return;
      
      scrollElement.current = element;
      
      // Only allow pull-to-refresh when scrolled to top
      // Check if element has scrollTop property and is at top
      try {
        const scrollTop = element.scrollTop ?? 0;
        if (scrollTop === 0) {
          startY.current = e.touches[0].clientY;
          setPullState(prev => ({ ...prev, isPulling: false }));
        }
      } catch (error) {
        // Element doesn't support scrollTop, skip pull-to-refresh
        console.warn('[usePullToRefresh] Element does not support scrollTop:', error);
        return;
      }
    },
    [enabled, pullState.isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || pullState.isRefreshing || !scrollElement.current) return;

      const currentY = e.touches[0].clientY;
      const deltaY = currentY - startY.current;

      // Only process downward pulls when at the top
      try {
        const scrollTop = scrollElement.current.scrollTop ?? 0;
        if (deltaY > 0 && scrollTop === 0) {
          e.preventDefault(); // Prevent native scroll

          // Apply resistance to create smooth pull effect
          const pullDistance = Math.min(deltaY / resistance, threshold * 1.5);
          const canRefresh = pullDistance >= threshold;

          setPullState(prev => ({
            ...prev,
            isPulling: true,
            pullDistance,
            canRefresh,
          }));
        }
      } catch (error) {
        // Element doesn't support scrollTop or was unmounted, skip pull-to-refresh
        console.warn('[usePullToRefresh] Error accessing scrollTop:', error);
        return;
      }
    },
    [enabled, pullState.isRefreshing, threshold, resistance]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!enabled || pullState.isRefreshing) return;

    if (pullState.canRefresh && pullState.isPulling) {
      setPullState(prev => ({
        ...prev,
        isRefreshing: true,
        isPulling: false,
      }));

      try {
        await onRefresh();
      } finally {
        setPullState(prev => ({
          ...prev,
          isRefreshing: false,
          pullDistance: 0,
          canRefresh: false,
        }));
      }
    } else {
      // Animate back to original position
      setPullState(prev => ({
        ...prev,
        isPulling: false,
        pullDistance: 0,
        canRefresh: false,
      }));
    }
  }, [enabled, pullState.canRefresh, pullState.isPulling, pullState.isRefreshing, onRefresh]);

  const pullToRefreshHandlers = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };

  // Calculate pull indicator opacity and scale
  const pullProgress = Math.min(pullState.pullDistance / threshold, 1);
  const indicatorOpacity = pullProgress;
  const indicatorScale = 0.5 + (pullProgress * 0.5);
  const indicatorRotation = pullProgress * 180;

  return {
    pullToRefreshHandlers,
    pullState,
    pullProgress,
    indicatorOpacity,
    indicatorScale,
    indicatorRotation,
    pullTransform: `translateY(${pullState.pullDistance}px)`,
  };
}