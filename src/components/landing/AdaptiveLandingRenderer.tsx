'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';

// Dynamic imports to split bundle size
const LandingPage = dynamic(() => import('./LandingPage'), {
    loading: () => <div className="h-screen w-full bg-background animate-pulse" />
});

const MobileLandingPage = dynamic(() => import('./mobile/MobileLandingPage'), {
    loading: () => <div className="h-screen w-full bg-background animate-pulse" />
});

export interface AdaptiveLandingProps {
    className?: string;
}

const AdaptiveLandingRenderer: React.FC<AdaptiveLandingProps> = ({ className = '' }) => {
    const { isReady, isMobile } = useDeviceDetection();

    // Use viewport width only so "Request Desktop Site" works correctly
    const useMobileVersion = isMobile;

    // Avoid rendering the wrong layout during hydration.
    if (!isReady) {
        return <div className="h-screen w-full bg-background animate-pulse" aria-hidden="true" />;
    }

    if (useMobileVersion) {
        return <MobileLandingPage className={className} />;
    }

    // Desktop/Web-optimized component
    return <LandingPage />;
};

export default AdaptiveLandingRenderer;
