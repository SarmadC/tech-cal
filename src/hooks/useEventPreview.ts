// src/hooks/useEventPreview.ts

import { useState, useCallback, useRef, useEffect } from 'react';
// 1. UPDATE IMPORT: Use the new, canonical `Event` type.
import { Event } from '@/types';

// 2. UPDATE INTERFACE: The state now holds an `Event` type.
interface PreviewState {
    event: Event | null;
    isVisible: boolean;
    position: { x: number; y: number };
}

interface Position {
    x: number;
    y: number;
}

const HOVER_DELAY = 100; // Reduced delay for more responsive feel
const HIDE_DELAY = 100; // Reduced delay for smoother transitions
const ANIMATION_DURATION = 200; // Matches CSS transition duration

export function useEventPreview() {
    const [previewState, setPreviewState] = useState<PreviewState>({
        event: null,
        isVisible: false,
        position: { x: 0, y: 0 }
    });

    const showTimerRef = useRef<NodeJS.Timeout | null>(null);
    const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            if (showTimerRef.current) clearTimeout(showTimerRef.current);
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        };
    }, []);

    // 3. UPDATE SIGNATURE: The `showPreview` function now accepts an `Event`.
    // Add hover delay to prevent jank when moving mouse across events
    const showPreview = useCallback((event: Event, position: Position) => {
        // Clear any pending hide timer
        if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
            hideTimerRef.current = null;
        }

        // Clear any pending show timer
        if (showTimerRef.current) {
            clearTimeout(showTimerRef.current);
        }

        // If already showing the same event, just update position immediately
        if (previewState.isVisible && previewState.event?.id === event.id) {
            setPreviewState(prev => ({
                ...prev,
                position
            }));
            return;
        }

        // If showing a different event, update immediately for smoother transitions
        if (previewState.isVisible && previewState.event?.id !== event.id) {
            setPreviewState({
                event,
                isVisible: true,
                position
            });
            return;
        }

        // Delay showing preview only for new events to avoid jank when quickly moving over events
        showTimerRef.current = setTimeout(() => {
            setPreviewState({
                event,
                isVisible: true,
                position
            });
            showTimerRef.current = null;
        }, HOVER_DELAY);
    }, [previewState.isVisible, previewState.event?.id]);

    const hidePreview = useCallback(() => {
        // Clear any pending show timer
        if (showTimerRef.current) {
            clearTimeout(showTimerRef.current);
            showTimerRef.current = null;
        }

        // Don't hide if already hidden
        if (!previewState.isVisible) {
            return;
        }

        // Two-step hiding process for smooth animation:
        // 1. First, set isVisible to false to trigger fade-out animation
        hideTimerRef.current = setTimeout(() => {
            setPreviewState(prev => ({
                ...prev,
                isVisible: false
            }));
            
            // 2. Then, clear the event after animation completes
            setTimeout(() => {
                setPreviewState({
                    event: null,
                    isVisible: false,
                    position: { x: 0, y: 0 }
                });
            }, ANIMATION_DURATION);
            
            hideTimerRef.current = null;
        }, HIDE_DELAY);
    }, [previewState.isVisible]);

    const cancelHide = useCallback(() => {
        if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
            hideTimerRef.current = null;
        }
    }, []);

    const forceHidePreview = useCallback(() => {
        // Clear all timers
        if (showTimerRef.current) {
            clearTimeout(showTimerRef.current);
            showTimerRef.current = null;
        }
        if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
            hideTimerRef.current = null;
        }

        setPreviewState({
            event: null,
            isVisible: false,
            position: { x: 0, y: 0 }
        });
    }, []);

    return {
        previewState,
        showPreview,
        hidePreview,
        cancelHide,
        forceHidePreview
    };
}
