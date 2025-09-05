'use client';

import React from 'react';

export type MobileViewType = 'today' | 'calendar';

export interface MobileTopNavigationProps {
  currentView: MobileViewType;
  onViewChange: (view: MobileViewType) => void;
  className?: string;
}

const MobileTopNavigation: React.FC<MobileTopNavigationProps> = ({
  currentView,
  onViewChange,
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
            Browse
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileTopNavigation;