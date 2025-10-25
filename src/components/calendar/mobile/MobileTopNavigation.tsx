'use client';

import React from 'react';
import { MaterialIcon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/badge';

export interface MobileTopNavigationProps {
  currentDate: Date;
  onToggleMonthPicker?: () => void;
  onToggleSearchFilter?: () => void;
  onToggleCalendarCollapse?: () => void;
  onToggleSidebar?: () => void;
  isCalendarCollapsed?: boolean;
  activeFilterCount?: number;
  className?: string;
}

const MobileTopNavigation: React.FC<MobileTopNavigationProps> = ({
  currentDate,
  onToggleMonthPicker: _onToggleMonthPicker,
  onToggleSearchFilter,
  onToggleCalendarCollapse,
  onToggleSidebar,
  isCalendarCollapsed = false,
  activeFilterCount = 0,
  className = ''
}) => {
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long' });

  return (
    <div className={`mobile-top-navigation-new ${className}`} role="navigation" aria-label="Mobile calendar navigation">
      <div className="mobile-nav-content-new">
        {/* Month Dropdown - Far Left */}
        <button
          onClick={onToggleCalendarCollapse}
          className={`mobile-month-dropdown ${isCalendarCollapsed ? 'collapsed' : ''}`}
          aria-label={isCalendarCollapsed ? "Expand calendar" : "Collapse calendar"}
        >
          <span className="month-text">{monthName}</span>
          <MaterialIcon 
            name="expand-more" 
            size={20} 
            className="month-chevron"
          />
        </button>

        {/* Spacer to push right elements to the right */}
        <div className="mobile-nav-spacer"></div>

        {/* Right side buttons */}
        <div className="mobile-nav-right-buttons">
          {/* Search Filter Button */}
          {onToggleSearchFilter && (
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
          )}

          {/* Hamburger Menu Button */}
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="mobile-hamburger-button"
              aria-label="Open sidebar menu"
            >
              <MaterialIcon name="menu" size={24} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileTopNavigation;