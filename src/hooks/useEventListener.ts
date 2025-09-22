/**
 * Centralized hook for managing event listeners with automatic cleanup
 * Ensures consistent cleanup patterns across the application
 */

import { useEffect, useRef } from 'react';

/**
 * Hook for adding event listeners with automatic cleanup
 * 
 * @param eventName - The event name to listen for
 * @param handler - The event handler function
 * @param element - The element to attach the listener to (defaults to window)
 * @param options - Event listener options
 */
export function useEventListener<T extends keyof WindowEventMap>(
  eventName: T,
  handler: (event: WindowEventMap[T]) => void,
  element: Window | Document | HTMLElement | null = typeof window !== 'undefined' ? window : null,
  options?: boolean | AddEventListenerOptions
) {
  // Store handler in ref to avoid re-attaching listeners on every render
  const handlerRef = useRef(handler);
  
  // Update handler ref when handler changes
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!element) return;

    const eventListener = (event: Event) => {
      handlerRef.current(event as WindowEventMap[T]);
    };

    element.addEventListener(eventName, eventListener, options);

    return () => {
      element.removeEventListener(eventName, eventListener, options);
    };
  }, [eventName, element, options]);
}

/**
 * Hook for managing scroll event listeners with automatic cleanup
 * 
 * @param handler - The scroll handler function
 * @param element - The element to attach the listener to (defaults to window)
 * @param options - Event listener options
 */
export function useScrollListener(
  handler: (event: Event) => void,
  element: Window | Document | HTMLElement | null = typeof window !== 'undefined' ? window : null,
  options?: boolean | AddEventListenerOptions
) {
  useEventListener('scroll', handler, element, options);
}

/**
 * Hook for managing resize event listeners with automatic cleanup
 * 
 * @param handler - The resize handler function
 * @param element - The element to attach the listener to (defaults to window)
 * @param options - Event listener options
 */
export function useResizeListener(
  handler: (event: Event) => void,
  element: Window | Document | HTMLElement | null = typeof window !== 'undefined' ? window : null,
  options?: boolean | AddEventListenerOptions
) {
  useEventListener('resize', handler, element, options);
}

/**
 * Hook for managing click outside events with automatic cleanup
 * 
 * @param ref - The ref of the element to check clicks outside of
 * @param handler - The handler function to call when clicking outside
 * @param enabled - Whether the listener should be active
 */
export function useClickOutside<T extends HTMLElement>(
  ref: React.RefObject<T>,
  handler: (event: MouseEvent) => void,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handler(event);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [ref, handler, enabled]);
}
