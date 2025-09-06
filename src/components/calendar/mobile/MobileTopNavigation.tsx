'use client';

import React from 'react';
import { MaterialIcon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/badge';

export type MobileViewType = 'today' | 'calendar';

export interface MobileTopNavigationProps {
  currentView: MobileViewType;
  onViewChange: (view: MobileViewType) => void;
  onToggleSearchFilter?: () => void;
  activeFilterCount?: number;
  className?: string;
}

const MobileTopNavigation: React.FC<MobileTopNavigationProps> = ({
  currentView,
  onViewChange,
  onToggleSearchFilter,
  activeFilterCount = 0,
  className = ''
}) => {
  return (
    <div className={`mobile-top-navigation ${className}`} role="navigation" aria-label="Mobile calendar navigation">
      <div className="mobile-nav-content">
        <div className="nav-tabs" role="tablist" aria-label="Calendar view selector">
          <button 
            className={`nav-tab ${currentView === 'today' ? 'active' : ''}`}
            onClick={() => onViewChange('today')}
            role="tab"
            aria-selected={currentView === 'today'}
            aria-controls="mobile-calendar-content"
            id="today-tab"
          >
            Discover
          </button>
          <button 
            className={`nav-tab ${currentView === 'calendar' ? 'active' : ''}`}
            onClick={() => onViewChange('calendar')}
            role="tab"
            aria-selected={currentView === 'calendar'}
            aria-controls="mobile-calendar-content"
            id="calendar-tab"
          >
            Week
          </button>
        </div>
        
        {/* Search Filter Button */}
        {onToggleSearchFilter && (
          <div className="nav-actions">
            <button
              onClick={onToggleSearchFilter}
              className="mobile-search-filter-button"
              aria-label="Open search and filters"
            >
              <MaterialIcon name="search" size={20} />
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="mobile-filter-count-badge">
                  {activeFilterCount}
                </Badge>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileTopNavigation;