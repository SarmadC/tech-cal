'use client';

import type { CSSProperties } from 'react';

import {
  loadingLogoAnimation,
  loadingLogoSpec,
  loadingLogoTones,
} from '@kurecal/brand';

import { cn } from '@/lib/utils';

import styles from './BrandLoadingLogo.module.css';

export interface BrandLoadingLogoProps {
  animated?: boolean;
  className?: string;
  color?: string;
  inline?: boolean;
  label?: string | null;
  size?: number | string;
}

export function BrandLoadingLogo({
  animated = true,
  className,
  color,
  inline = false,
  label = 'Loading',
  size = 48,
}: BrandLoadingLogoProps) {
  const wrapperStyle: CSSProperties & Record<string, string | number | undefined> = {
    '--brand-loading-logo-arm-opacity-min': loadingLogoAnimation.armOpacityMin,
    '--brand-loading-logo-float-distance': `${loadingLogoAnimation.floatDistancePx}px`,
    '--brand-loading-logo-float-duration': `${loadingLogoAnimation.floatDurationMs}ms`,
    '--brand-loading-logo-pulse-duration': `${loadingLogoAnimation.pulseDurationMs}ms`,
    color,
  };

  if (size !== 48) {
    wrapperStyle.height = size;
    wrapperStyle.width = size;
  }

  return (
    <span
      aria-hidden={label ? undefined : true}
      aria-label={label ?? undefined}
      className={cn(
        styles.root,
        'inline-flex h-12 w-12 items-center justify-center',
        className
      )}
      role={label ? 'img' : undefined}
      style={wrapperStyle}
    >
      <span className={cn(!inline && animated && styles.float)}>
        <svg
          className={styles.svg}
          fill="none"
          focusable="false"
          viewBox={loadingLogoSpec.viewBox}
          xmlns="http://www.w3.org/2000/svg"
        >
          {loadingLogoSpec.arms.map((arm) => (
            <g
              key={arm.id}
              className={cn(animated && styles.armAnimated)}
              style={
                animated
                  ? ({
                      '--brand-loading-logo-arm-delay': `${loadingLogoAnimation.pulseDelaysMs[arm.id]}ms`,
                    } as CSSProperties)
                  : undefined
              }
            >
              {arm.polygons.map((polygon, index) => (
                <polygon
                  key={`${arm.id}-${index}`}
                  fill="currentColor"
                  fillOpacity={loadingLogoTones[polygon.tone]}
                  points={polygon.points}
                />
              ))}
            </g>
          ))}
          <polygon
            fill="currentColor"
            fillOpacity={loadingLogoTones[loadingLogoSpec.centerCap.tone]}
            points={loadingLogoSpec.centerCap.points}
          />
        </svg>
      </span>
    </span>
  );
}
