'use client';

import { FC } from 'react';
import { MaterialIcon, IconName } from '@/components/ui/Icon';

type CalendarViewType = 'month' | 'week' | 'day';

export interface MobileCalendarNavigationProps {
    currentView: CalendarViewType;
    onViewChange: (view: CalendarViewType) => void;
    onToggleSidebar: () => void;
    onToggleFilters: () => void;
    activeFilterCount: number;
    isSidebarOpen: boolean;
}

const MobileCalendarNavigation: FC<MobileCalendarNavigationProps> = ({
    currentView,
    onViewChange,
    onToggleSidebar,
    onToggleFilters,
    activeFilterCount,
    isSidebarOpen
}) => {
    const viewOptions: Array<{ key: CalendarViewType; label: string; icon: IconName }> = [
        { key: 'month', label: 'Month', icon: 'calendar' },
        { key: 'week', label: 'Week', icon: 'event' },
        { key: 'day', label: 'Day', icon: 'time' }
    ];

    return (
        <div className="mobile-calendar-nav">
            {/* Top Row - Main Actions */}
            <div className="mobile-nav-header">
                <div className="flex items-center space-x-2">
                    <button
                        onClick={onToggleSidebar}
                        className="mobile-nav-button"
                        aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
                    >
                        <MaterialIcon name={isSidebarOpen ? "close" : "menu"} size={20} />
                    </button>
                    <h1 className="mobile-nav-title">Calendar</h1>
                </div>
                
                <div className="mobile-nav-actions">
                    <button
                        onClick={onToggleFilters}
                        className="mobile-nav-button relative"
                        aria-label="Toggle filters"
                    >
                        <MaterialIcon name="filter" size={20} />
                        {activeFilterCount > 0 && (
                            <div className="mobile-filter-badge">
                                {activeFilterCount}
                            </div>
                        )}
                    </button>
                </div>
            </div>

            {/* Bottom Row - View Switcher */}
            <div className="mobile-view-switcher">
                <div className="view-switcher-container">
                    {viewOptions.map((option) => (
                        <button
                            key={option.key}
                            onClick={() => onViewChange(option.key)}
                            className={`mobile-view-button ${
                                currentView === option.key ? 'active' : ''
                            }`}
                        >
                            <MaterialIcon name={option.icon} size={16} />
                            <span>{option.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default MobileCalendarNavigation;
