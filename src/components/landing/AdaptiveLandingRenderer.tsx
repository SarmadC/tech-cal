'use client';

import React from 'react';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import LandingPage from './LandingPage';
import MobileLandingPage from './mobile/MobileLandingPage';

export interface AdaptiveLandingProps {
  className?: string;
}

const AdaptiveLandingRenderer: React.FC<AdaptiveLandingProps> = ({ className = '' }) => {
  const { isMobile, isTablet, isTouchDevice } = useDeviceDetection();

  // Determine if we should use mobile components
  // Consider both viewport size and touch capability
  const useMobileVersion = isMobile || (isTablet && isTouchDevice);

  if (useMobileVersion) {
    return <MobileLandingPage className={className} />;
  }

  // Desktop/Web-optimized component
  return <LandingPage />;
};

export default AdaptiveLandingRenderer;
