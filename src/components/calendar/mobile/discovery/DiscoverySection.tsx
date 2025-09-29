'use client';

import React from 'react';
import { Sparkle } from '@phosphor-icons/react';
import { generateSectionId, generateSectionDescId } from '@/utils/domUtils';

export interface DiscoverySectionProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onViewAll?: () => void;
  showViewAll?: boolean;
  className?: string;
  iconVariant?: 'for-you' | 'trending' | 'new-this-week' | 'quick-wins';
}

const DiscoverySection: React.FC<DiscoverySectionProps> = ({
  title,
  subtitle,
  icon,
  children,
  onViewAll,
  showViewAll = false,
  className = '',
  iconVariant = 'for-you'
}) => {
  const sectionId = generateSectionId(title);
  const sectionDescId = generateSectionDescId(title);

  return (
    <section className={`discovery-section ${className}`} role="region" aria-labelledby={sectionId}>
      <div className="discovery-section-header">
        <div className="section-title-container">
          <div className={`section-icon ${iconVariant}`}>
            {icon || <Sparkle size={20} weight="fill" />}
          </div>
          <div className="section-text">
            <h2
              id={sectionId}
              className="section-title"
            >
              {title}
            </h2>
            {subtitle && (
              <p
                className="section-subtitle"
                id={sectionDescId}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {showViewAll && onViewAll && (
          <button
            className="view-all-button"
            onClick={onViewAll}
            aria-label={`View all ${title.toLowerCase()}`}
            aria-describedby={subtitle ? sectionDescId : undefined}
          >
            <span className="view-all-text">View All</span>
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
