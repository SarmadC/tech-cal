// src/hooks/useEventPreview.ts

import { useState, useCallback } from 'react';
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

export function useEventPreview() {
    const [previewState, setPreviewState] = useState<PreviewState>({
        event: null,
        isVisible: false,
        position: { x: 0, y: 0 }
    });

    // 3. UPDATE SIGNATURE: The `showPreview` function now accepts an `Event`.
    const showPreview = useCallback((event: Event, position: Position) => {
        setPreviewState({
            event,
            isVisible: true,
            position
        });
    }, []);

    const hidePreview = useCallback(() => {
        setPreviewState(prev => ({
            ...prev,
            isVisible: false
        }));
    }, []);

    const forceHidePreview = useCallback(() => {
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
        forceHidePreview
    };
}
