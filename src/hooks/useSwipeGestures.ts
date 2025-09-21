'use client';

import { useRef, useCallback, useState, useEffect } from 'react';

interface SwipeConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  preventScroll?: boolean;
  enableMomentum?: boolean;
}

interface SwipeState {
  isActive: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  deltaX: number;
  deltaY: number;
  velocity: number;
  direction: 'left' | 'right' | 'up' | 'down' | null;
}

export function useSwipeGestures(config: SwipeConfig) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    preventScroll = false,
    enableMomentum = true,
  } = config;

  const [swipeState, setSwipeState] = useState<SwipeState>({
    isActive: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    deltaX: 0,
    deltaY: 0,
    velocity: 0,
    direction: null,
  });

  const timeRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    timeRef.current = Date.now();
    
    setSwipeState(prev => ({
      ...prev,
      isActive: true,
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      deltaX: 0,
      deltaY: 0,
      velocity: 0,
      direction: null,
    }));

    if (preventScroll) {
      e.preventDefault();
    }
  }, [preventScroll]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swipeState.isActive) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - swipeState.startX;
    const deltaY = touch.clientY - swipeState.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const time = Date.now() - timeRef.current;
    const velocity = time > 0 ? distance / time : 0;

    let direction: SwipeState['direction'] = null;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX > 0 ? 'right' : 'left';
    } else {
      direction = deltaY > 0 ? 'down' : 'up';
    }

    setSwipeState(prev => ({
      ...prev,
      currentX: touch.clientX,
      currentY: touch.clientY,
      deltaX,
      deltaY,
      velocity,
      direction,
    }));

    if (preventScroll && Math.abs(deltaX) > Math.abs(deltaY)) {
      e.preventDefault();
    }
  }, [swipeState.isActive, swipeState.startX, swipeState.startY, preventScroll]);

  const handleTouchEnd = useCallback(() => {
    if (!swipeState.isActive) return;

    const { deltaX, deltaY, velocity } = swipeState;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // Apply momentum multiplier for fast swipes
    const momentumMultiplier = enableMomentum && velocity > 0.3 ? 1.5 : 1;
    const effectiveThreshold = threshold / momentumMultiplier;

    if (absX > absY && absX > effectiveThreshold) {
      // Horizontal swipe
      if (deltaX > 0) {
        onSwipeRight?.();
      } else {
        onSwipeLeft?.();
      }
    } else if (absY > effectiveThreshold) {
      // Vertical swipe
      if (deltaY > 0) {
        onSwipeDown?.();
      } else {
        onSwipeUp?.();
      }
    }

    setSwipeState(prev => ({
      ...prev,
      isActive: false,
      deltaX: 0,
      deltaY: 0,
      velocity: 0,
      direction: null,
    }));
  }, [swipeState, threshold, enableMomentum, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  // Smooth animation frame updates
  useEffect(() => {
    if (swipeState.isActive && enableMomentum) {
      const animate = () => {
        // Smooth momentum animation could be added here
        rafRef.current = requestAnimationFrame(animate);
      };
      rafRef.current = requestAnimationFrame(animate);
    } else {
      // Cancel animation frame when not active
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, [swipeState.isActive, enableMomentum]);

  const swipeHandlers = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };

  return {
    swipeHandlers,
    swipeState,
  };
}