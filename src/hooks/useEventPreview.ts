// Update the useEventPreview hook to match the expected interface
// src/hooks/useEventPreview.ts

import { useState, useCallback } from 'react';
import { AppEvent } from '@/types';

interface PreviewState {
    event: AppEvent | null;
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

    const showPreview = useCallback((event: AppEvent, position: Position) => {
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