// src/hooks/useLoadingState.ts
'use client';

import { useState, useCallback, useMemo } from 'react';

export interface LoadingState {
  [key: string]: boolean;
}

export interface UseLoadingStateReturn {
  isLoading: (key?: string) => boolean;
  setLoading: (key: string, loading: boolean) => void;
  setLoadingMultiple: (states: Record<string, boolean>) => void;
  clearLoading: (key?: string) => void;
  loadingStates: LoadingState;
}

/**
 * Centralized loading state management hook
 * Handles multiple loading states with a simple, robust API
 */
export function useLoadingState(initialStates: string[] = []): UseLoadingStateReturn {
  const [loadingStates, setLoadingStates] = useState<LoadingState>(() => {
    const initial: LoadingState = {};
    initialStates.forEach(key => {
      initial[key] = false;
    });
    return initial;
  });

  const isLoading = useCallback((key?: string): boolean => {
    if (!key) {
      // Return true if any loading state is active
      return Object.values(loadingStates).some(state => state);
    }
    return loadingStates[key] || false;
  }, [loadingStates]);

  const setLoading = useCallback((key: string, loading: boolean) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: loading
    }));
  }, []);

  const setLoadingMultiple = useCallback((states: Record<string, boolean>) => {
    setLoadingStates(prev => ({
      ...prev,
      ...states
    }));
  }, []);

  const clearLoading = useCallback((key?: string) => {
    if (!key) {
      // Clear all loading states
      setLoadingStates({});
    } else {
      setLoadingStates(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }, []);

  return useMemo(() => ({
    isLoading,
    setLoading,
    setLoadingMultiple,
    clearLoading,
    loadingStates
  }), [isLoading, setLoading, setLoadingMultiple, clearLoading, loadingStates]);
}
