'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook for persisting state in localStorage with SSR safety.
 * 
 * @param key - localStorage key
 * @param initialValue - default value when no stored value exists
 * @returns [storedValue, setValue] - same API as useState
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // Use ref to avoid re-creating getStoredValue on every render
  const initialValueRef = useRef(initialValue);
  
  // Lazy initialization function for useState
  const getInitialValue = (): T => {
    if (typeof window === 'undefined') {
      return initialValueRef.current;
    }
    
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValueRef.current;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValueRef.current;
    }
  };

  // Initialize state with lazy initializer to avoid SSR issues
  const [storedValue, setStoredValue] = useState<T>(getInitialValue);

  // Track if we're on client side
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate on mount (only runs once)
  useEffect(() => {
    setIsHydrated(true);
    // Re-read from localStorage after hydration to ensure we have the latest value
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item);
        setStoredValue(parsed);
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
    }
  }, [key]);

  // Update localStorage when value changes (skip on initial hydration)
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      setStoredValue((prev) => {
        const newValue = value instanceof Function ? value(prev) : value;
        
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(newValue));
        }
        
        return newValue;
      });
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key]);

  return [storedValue, setValue];
}
