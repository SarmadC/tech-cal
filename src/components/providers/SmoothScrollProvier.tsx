// src/components/providers/SmoothScrollProvider.tsx
'use client';

import { ReactNode, useEffect, useRef } from 'react';
import Lenis from '@studio-freight/lenis';

export default function SmoothScrollProvider({ children }: { children: ReactNode }) {
    const lenisRef = useRef<Lenis | null>(null);

    useEffect(() => {
        // Initialize Lenis for smooth scrolling
        const lenis = new Lenis({
            lerp: 0.1, // Controls the "smoothness". Lower is smoother.
            smoothWheel: true,
        });
        lenisRef.current = lenis;

        // Animation frame loop to update Lenis
        let rafId: number;
        function raf(time: number) {
            lenis.raf(time);
            rafId = requestAnimationFrame(raf);
        }
        rafId = requestAnimationFrame(raf);

        // Cleanup on unmount
        return () => {
            if (rafId) {
                cancelAnimationFrame(rafId);
            }
            lenis.destroy();
            lenisRef.current = null;
        };
    }, []);

    return <>{children}</>;
}