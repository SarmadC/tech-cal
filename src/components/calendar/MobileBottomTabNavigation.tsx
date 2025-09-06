'use client';

import { FC, useState } from 'react';
import { MaterialIcon, IconName } from '@/components/ui/Icon';
import QuickDatePicker from './QuickDatePicker';
import MobileSearchFilter from './MobileSearchFilter';
import { SmartFilterOptions } from '@/hooks/useSmartFilters';

type CalendarViewType = 'month' | 'week' | 'day';

export interface MobileBottomTabNavigationProps {
    currentView: CalendarViewType;
    onViewChange: (view: CalendarViewType) => void;
    onToggleSidebar: () => void;
    onToggleFilters: () => void;
    onDateChange: (date: Date) => void;
    activeFilterCount: number;
    isSidebarOpen: boolean;
    currentDate: Date;
    // Enhanced search/filter props
    filters: SmartFilterOptions;
    onUpdateFilter: <K extends keyof SmartFilterOptions>(key: K, value: SmartFilterOptions[K]) => void;
    onResetFilters: () => void;
    onApplyQuickFilter: (filterType: string) => void;
    searchSuggestions?: Array<{ id: string; title: string; type: 'event' | 'organizer' | 'category' }>;
    onSearchSuggestionSelect?: (suggestion: { id: string; title: string; type: 'event' | 'organizer' | 'category' }) => void;
}

const MobileBottomTabNavigation: FC<MobileBottomTabNavigationProps> = ({
    currentView,
    onViewChange,
    onToggleSidebar,
    onToggleFilters: _onToggleFilters,
    onDateChange,
    activeFilterCount,
    isSidebarOpen,
    currentDate,
    filters,
    onUpdateFilter,
    onResetFilters,
    onApplyQuickFilter,
    searchSuggestions,
    onSearchSuggestionSelect
}) => {
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [isSearchFilterOpen, setIsSearchFilterOpen] = useState(false);
    const viewOptions: Array<{ key: CalendarViewType; label: string; icon: IconName }> = [
        { key: 'month', label: 'Month', icon: 'calendar' },
        { key: 'week', label: 'Week', icon: 'event' },
        { key: 'day', label: 'Day', icon: 'time' }
    ];

    return (
        <>
            {/* Compact Top Header */}
            <div className="mobile-top-header">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={onToggleSidebar}
                            className="mobile-header-button"
                            aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
                        >
                            <MaterialIcon name={isSidebarOpen ? "close" : "menu"} size={20} />
                        </button>
                        <button
                            onClick={() => setIsDatePickerOpen(true)}
                            className="mobile-date-picker-trigger"
                            aria-label="Open date picker"
                        >
                            <h1 className="mobile-header-title">Calendar</h1>
                            <MaterialIcon name="calendar" size={16} />
                        </button>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setIsSearchFilterOpen(true)}
                            className="mobile-header-button relative"
                            aria-label="Open search and filters"
                        >
                            <MaterialIcon name="search" size={20} />
                            {activeFilterCount > 0 && (
                                <div className="mobile-filter-badge">
                                    {activeFilterCount}
                                </div>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Bottom Tab Navigation */}
            <div className="mobile-bottom-tabs">
                <div className="bottom-tabs-container">
                    {viewOptions.map((option) => (
                        <button
                            key={option.key}
                            onClick={() => onViewChange(option.key)}
                            className={`bottom-tab-button ${
                                currentView === option.key ? 'active' : ''
                            }`}
                            aria-label={`Switch to ${option.label} view`}
                        >
                            <div className="bottom-tab-icon">
                                <MaterialIcon 
                                    name={option.icon} 
                                    size={currentView === option.key ? 22 : 20} 
                                />
                            </div>
                            <span className="bottom-tab-label">{option.label}</span>
                            {currentView === option.key && (
                                <div className="bottom-tab-indicator" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Quick Date Picker */}
            <QuickDatePicker
                currentDate={currentDate}
                onDateChange={onDateChange}
                view={currentView}
                isOpen={isDatePickerOpen}
                onClose={() => setIsDatePickerOpen(false)}
            />

            {/* Enhanced Search & Filter */}
            <MobileSearchFilter
                filters={filters}
                onUpdateFilter={onUpdateFilter}
                onResetFilters={onResetFilters}
                onApplyQuickFilter={onApplyQuickFilter}
                activeFilterCount={activeFilterCount}
                isOpen={isSearchFilterOpen}
                onClose={() => setIsSearchFilterOpen(false)}
                searchSuggestions={searchSuggestions}
                onSearchSuggestionSelect={onSearchSuggestionSelect}
            />
        </>
    );
};

export default MobileBottomTabNavigation;
