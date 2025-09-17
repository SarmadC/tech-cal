'use client';

import React from 'react';
import { CaretRight, Sparkle } from '@phosphor-icons/react';

export interface DiscoverySectionProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onViewAll?: () => void;
  showViewAll?: boolean;
  className?: string;
}

const DiscoverySection: React.FC<DiscoverySectionProps> = ({
  title,
  subtitle,
  icon,
  children,
  onViewAll,
  showViewAll = false,
  className = ''
}) => {
  return (
    <section className={`discovery-section ${className}`} role="region" aria-labelledby={`section-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="discovery-section-header">
        <div className="section-title-container">
          <div className="section-icon">
            {icon || <Sparkle size={20} weight="fill" />}
          </div>
          <div className="section-text">
            <h2 
              id={`section-${title.toLowerCase().replace(/\s+/g, '-')}`}
              className="section-title"
            >
              {title}
            </h2>
            {subtitle && (
              <p className="section-subtitle">{subtitle}</p>
            )}
          </div>
        </div>
        
        {showViewAll && onViewAll && (
          <button 
            className="view-all-button"
            onClick={onViewAll}
            aria-label={`View all ${title.toLowerCase()}`}
          >
            <span className="view-all-text">View All</span>
            <CaretRight size={16} />
          </button>
        )}
      </div>
      
      <div className="discovery-section-content" role="list">
        {children}
      </div>
    </section>
  );
};

export default DiscoverySection;
