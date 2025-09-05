'use client';

import React from 'react';
import './skeleton-loader.css';

export interface SkeletonLoaderProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'event-card' | 'nav-button' | 'timeline';
  width?: string | number;
  height?: string | number;
  count?: number;
  animated?: boolean;
  className?: string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = 'rectangular',
  width,
  height,
  count = 1,
  animated = true,
  className = '',
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'text':
        return {
          height: '1em',
          borderRadius: '4px',
        };
      case 'circular':
        return {
          borderRadius: '50%',
          width: width || 40,
          height: height || 40,
        };
      case 'event-card':
        return {
          height: 76,
          borderRadius: '12px',
          marginBottom: '12px',
        };
      case 'nav-button':
        return {
          width: 44,
          height: 44,
          borderRadius: '50%',
        };
      case 'timeline':
        return {
          height: 120,
          borderRadius: '12px',
          marginBottom: '16px',
        };
      default:
        return {
          borderRadius: '8px',
        };
    }
  };

  const skeletonStyle = {
    width: width || '100%',
    height: height || 20,
    ...getVariantStyles(),
  };

  const skeletonClass = `
    skeleton-loader
    ${animated ? 'skeleton-animated' : ''}
    ${className}
  `.trim();

  if (count === 1) {
    return <div className={skeletonClass} style={skeletonStyle} />;
  }

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div 
          key={index} 
          className={skeletonClass} 
          style={{
            ...skeletonStyle,
            animationDelay: animated ? `${index * 0.1}s` : undefined,
          }} 
        />
      ))}
    </>
  );
};

// Specialized skeleton components for mobile calendar
export const EventCardSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="skeleton-event-cards">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="skeleton-event-card">
        <div className="skeleton-event-time">
          <SkeletonLoader variant="text" width="60px" height="12px" />
        </div>
        <div className="skeleton-event-content">
          <SkeletonLoader variant="text" width="80%" height="16px" />
          <SkeletonLoader variant="text" width="60%" height="12px" />
        </div>
        <SkeletonLoader variant="circular" width="16px" height="16px" />
      </div>
    ))}
  </div>
);

export const WeekHeaderSkeleton: React.FC = () => (
  <div className="skeleton-week-header">
    <div className="skeleton-nav-buttons">
      <SkeletonLoader variant="nav-button" />
      <div className="skeleton-day-info">
        <SkeletonLoader variant="text" width="120px" height="20px" />
        <SkeletonLoader variant="text" width="80px" height="14px" />
      </div>
      <SkeletonLoader variant="nav-button" />
    </div>
    <div className="skeleton-dots">
      {Array.from({ length: 7 }).map((_, index) => (
        <SkeletonLoader 
          key={index} 
          variant="circular" 
          width="8px" 
          height="8px" 
        />
      ))}
    </div>
  </div>
);

export const DayViewSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="skeleton-timeline">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="skeleton-timeline-item">
        <div className="skeleton-timeline-time">
          <SkeletonLoader variant="circular" width="8px" height="8px" />
          <SkeletonLoader variant="text" width="50px" height="12px" />
        </div>
        <div className="skeleton-timeline-content">
          <div className="skeleton-timeline-event">
            <SkeletonLoader variant="text" width="70%" height="16px" />
            <SkeletonLoader variant="text" width="50%" height="12px" />
            <SkeletonLoader variant="text" width="40%" height="12px" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const MonthViewSkeleton: React.FC = () => (
  <div className="skeleton-month-grid">
    {Array.from({ length: 42 }).map((_, index) => (
      <div key={index} className="skeleton-month-day">
        <SkeletonLoader variant="text" width="20px" height="20px" />
        <div style={{ display: 'flex', gap: '2px', marginTop: '4px' }}>
          <SkeletonLoader variant="circular" width="4px" height="4px" />
          <SkeletonLoader variant="circular" width="4px" height="4px" />
        </div>
      </div>
    ))}
  </div>
);