// src/hooks/useEventPreview.ts
import { useState, useCallback, useRef } from 'react';
import { AppEvent } from '@/types';

interface PreviewState {
    event: AppEvent | null;
    isVisible: boolean;
    position: { x: number; y: number };
}

export function useEventPreview() {
    const [previewState, setPreviewState] = useState<PreviewState>({
        event: null,
        isVisible: false,
        position: { x: 0, y: 0 }
    });

    const hoverTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const hideTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

    const showPreview = useCallback((event: AppEvent, mouseEvent: MouseEvent) => {
        // Clear any existing timeouts
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
        }

        // Small delay before showing to prevent flickering
        hoverTimeoutRef.current = setTimeout(() => {
            setPreviewState({
                event,
                isVisible: true,
                position: {
                    x: mouseEvent.clientX + 10,
                    y: mouseEvent.clientY + 10
                }
            });
        }, 300);
    }, []);

    const hidePreview = useCallback(() => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }

        // Small delay before hiding to allow moving to preview card
        hideTimeoutRef.current = setTimeout(() => {
            setPreviewState(prev => ({ ...prev, isVisible: false }));
        }, 100);
    }, []);

    const forceHidePreview = useCallback(() => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
        }
        setPreviewState(prev => ({ ...prev, isVisible: false }));
    }, []);

    return {
        previewState,
        showPreview,
        hidePreview,
        forceHidePreview
    };
}