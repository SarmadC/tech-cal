'use client';

import { useEffect, useRef } from 'react';

// Global flag to prevent multiple simultaneous loads
let isLoading = false;
let loadPromise: Promise<void> | null = null;

/**
 * Conditionally loads FullCalendar CSS only when needed
 * Prevents render-blocking CSS on non-calendar pages
 * Uses singleton pattern to prevent duplicate loads
 */
export function FullCalendarCSSLoader() {
    const hasLoaded = useRef(false);

    useEffect(() => {
        // Skip if already loaded in this component instance
        if (hasLoaded.current) return;

        // Check if CSS is already in DOM
        const existingLink = document.querySelector('link[href*="fullcalendar"]');
        if (existingLink) {
            hasLoaded.current = true;
            return;
        }

        // If already loading, wait for it
        if (isLoading && loadPromise) {
            loadPromise.then(() => {
                hasLoaded.current = true;
            });
            return;
        }

        // Start loading
        isLoading = true;
        hasLoaded.current = true;

        loadPromise = new Promise<void>((resolve) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.19/index.global.min.css';
            link.crossOrigin = 'anonymous';
            
            link.onload = () => {
                isLoading = false;
                resolve();
            };
            
            link.onerror = () => {
                isLoading = false;
                console.warn('Failed to load FullCalendar CSS');
                resolve(); // Still resolve to prevent hanging
            };
            
            document.head.appendChild(link);
        });
    }, []);

    return null;
}
