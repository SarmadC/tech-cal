'use client';

import { useState, useEffect } from 'react';
import {
  BREAKPOINTS,
  isDesktopViewportWidth,
  isMobileViewportWidth,
  isTabletViewportWidth,
} from '@/constants/responsive';

export interface DeviceInfo {
  isReady: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  viewport: {
    width: number;
    height: number;
  };
  userAgent: {
    isIOS: boolean;
    isAndroid: boolean;
    isSafari: boolean;
    isChrome: boolean;
  };
}

export function useDeviceDetection(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isReady: false,
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isTouchDevice: false,
    viewport: {
      width: 1200, // Default desktop width for SSR
      height: 800,
    },
    userAgent: {
      isIOS: false,
      isAndroid: false,
      isSafari: false,
      isChrome: false,
    },
  });

  useEffect(() => {
    let orientationTimeoutId: NodeJS.Timeout | null = null;

    const updateDeviceInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // Viewport-based detection
      const isMobile = isMobileViewportWidth(width);
      const isTablet = isTabletViewportWidth(width);
      const isDesktop = isDesktopViewportWidth(width);
      
      // Touch detection
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // User agent detection
      const userAgent = navigator.userAgent.toLowerCase();
      const isIOS = /iphone|ipad|ipod/.test(userAgent);
      const isAndroid = /android/.test(userAgent);
      const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent);
      const isChrome = /chrome/.test(userAgent);

      setDeviceInfo({
        isReady: true,
        isMobile,
        isTablet,
        isDesktop,
        isTouchDevice,
        viewport: { width, height },
        userAgent: {
          isIOS,
          isAndroid,
          isSafari,
          isChrome,
        },
      });
    };

    const handleOrientationChange = () => {
      // Clear any existing timeout
      if (orientationTimeoutId) {
        clearTimeout(orientationTimeoutId);
      }
      // Small delay to ensure viewport dimensions are updated
      orientationTimeoutId = setTimeout(updateDeviceInfo, 100);
    };

    // Initial detection
    updateDeviceInfo();

    // Listen for resize events
    window.addEventListener('resize', updateDeviceInfo);
    
    // Listen for orientation changes (mobile)
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
      window.removeEventListener('orientationchange', handleOrientationChange);
      if (orientationTimeoutId) {
        clearTimeout(orientationTimeoutId);
      }
    };
  }, []);

  return deviceInfo;
}

// Helper hook for simple mobile detection (backward compatibility)
export function useIsMobile(): boolean {
  const { isMobile } = useDeviceDetection();
  return isMobile;
}

// Helper hook for touch device detection
export function useIsTouchDevice(): boolean {
  const { isTouchDevice } = useDeviceDetection();
  return isTouchDevice;
}
