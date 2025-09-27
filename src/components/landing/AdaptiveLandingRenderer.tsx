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
  // Use viewport size as primary factor, touch as secondary
  const useMobileVersion = isMobile || (isTablet && isTouchDevice) || (isMobile && !isTouchDevice);

  // Debug logging (leave for troubleshooting; remove later if noisy)
  console.log('Device Detection:', { isMobile, isTablet, isTouchDevice, useMobileVersion });

  if (useMobileVersion) {
    return <MobileLandingPage className={className} />;
  }

  // Desktop/Web-optimized component
  return <LandingPage />;
};

export default AdaptiveLandingRenderer;
