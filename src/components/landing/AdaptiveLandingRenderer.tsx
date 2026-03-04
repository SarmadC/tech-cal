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
    const { isReady, isMobile, isTablet, isTouchDevice } = useDeviceDetection();

    // Determine if we should use mobile components
    // Use viewport size as primary factor, touch as secondary
    const useMobileVersion = isMobile || (isTablet && isTouchDevice);

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
