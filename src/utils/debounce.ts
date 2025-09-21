/**
 * Centralized debounce utility to prevent code duplication
 * Provides both function debouncing and hook-based debouncing
 */

/**
 * Generic debounce function that delays execution until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked.
 * 
 * @param func - The function to debounce
 * @param wait - The number of milliseconds to delay
 * @returns A debounced version of the function
 */
export function debounce<F extends (...args: unknown[]) => unknown>(
  func: F,
  wait: number
): (...args: Parameters<F>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<F>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function that ensures a function is called at most once per wait period
 * 
 * @param func - The function to throttle
 * @param wait - The number of milliseconds to throttle
 * @returns A throttled version of the function
 */
export function throttle<F extends (...args: unknown[]) => unknown>(
  func: F,
  wait: number
): (...args: Parameters<F>) => void {
  let timeout: NodeJS.Timeout | null = null;
  let previous = 0;
  
  return function executedFunction(...args: Parameters<F>) {
    const now = Date.now();
    const remaining = wait - (now - previous);
    
    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func(...args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        previous = Date.now();
        timeout = null;
        func(...args);
      }, remaining);
    }
  };
}

/**
 * Creates a debounced version of a callback with proper cleanup
 * Returns both the debounced function and a cleanup function
 * 
 * @param callback - The callback to debounce
 * @param wait - The debounce delay
 * @returns Object with debounced callback and cleanup function
 */
export function createDebouncedCallback<F extends (...args: unknown[]) => unknown>(
  callback: F,
  wait: number
) {
  let timeout: NodeJS.Timeout | null = null;
  
  const debouncedCallback = (...args: Parameters<F>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => callback(...args), wait);
  };
  
  const cleanup = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };
  
  return {
    debouncedCallback,
    cleanup
  };
}
