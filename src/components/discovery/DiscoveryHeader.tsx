'use client';

import React, { useState } from 'react';
import { MagnifyingGlass, MapPin, Calendar, SlidersHorizontal, ArrowCounterClockwise } from '@phosphor-icons/react';
import QuickDatePicker from '@/components/calendar/QuickDatePicker';

interface DiscoveryHeaderProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    location: string;
    onLocationChange: (value: string) => void;
    dateRange: { start: Date | null; end: Date | null };
    onDateRangeChange: (range: { start: Date | null; end: Date | null }) => void;
    onSearch: () => void;
    onResetFilters: () => void;
    activeFilterCount: number;
    onFilterClick?: () => void;
}

// Helper function to format date range for display
const formatDateRange = (range: { start: Date | null; end: Date | null }): string => {
    if (!range.start && !range.end) {
        return 'Any Date';
    }

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
        });
    };

    if (range.start && range.end) {
        const startYear = range.start.getFullYear();
        const endYear = range.end.getFullYear();
        const startMonth = range.start.getMonth();
        const endMonth = range.end.getMonth();

        if (startYear === endYear && startMonth === endMonth) {
            // Same month: "Jan 1-15, 2025"
            return `${range.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}-${range.end.getDate()}, ${startYear}`;
        } else if (startYear === endYear) {
            // Same year, different months: "Jan 1 - Feb 15, 2025"
            return `${formatDate(range.start)} - ${formatDate(range.end)}`;
        } else {
            // Different years: "Jan 1, 2024 - Jan 15, 2025"
            return `${range.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${range.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        }
    } else if (range.start) {
        return `From ${formatDate(range.start)}`;
    } else if (range.end) {
        return `Until ${formatDate(range.end)}`;
    }

    return 'Any Date';
};

// Memoize to prevent unnecessary re-renders when parent updates
const DiscoveryHeader: React.FC<DiscoveryHeaderProps> = React.memo(({
    searchTerm,
    onSearchChange,
    location,
    onLocationChange,
    dateRange,
    onDateRangeChange,
    onSearch,
    onResetFilters,
    activeFilterCount,
    onFilterClick
}) => {
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    return (
        <div className="bg-card/80 dark:bg-card/20 rounded-2xl p-4 shadow-lg border border-border/60 backdrop-blur mb-8 transition-colors">
            <div className="flex flex-col lg:flex-row items-center gap-4">

                {/* Search Input */}
                <div className="flex-1 w-full relative group">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground group-focus-within:text-foreground transition-colors">
                        <MagnifyingGlass size={20} />
                    </div>
                    <input
                        type="text"
                        placeholder="Search events..."
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-transparent bg-muted/60 dark:bg-muted/20 focus:ring-2 focus:ring-primary/20 focus:border-primary/40 focus:bg-background/40 transition-all outline-none text-foreground placeholder:text-muted-foreground"
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                    />
                </div>

                {/* Divider */}
                <div className="hidden lg:block w-px h-10 bg-border/60"></div>

                {/* Location Input */}
                <div className="flex-1 w-full relative group">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground group-focus-within:text-foreground transition-colors">
                        <MapPin size={20} />
                    </div>
                    <input
                        type="text"
                        placeholder="Location (e.g. San Francisco)"
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-transparent bg-muted/60 dark:bg-muted/20 focus:ring-2 focus:ring-primary/20 focus:border-primary/40 focus:bg-background/40 transition-all outline-none text-foreground placeholder:text-muted-foreground"
                        value={location}
                        onChange={(e) => onLocationChange(e.target.value)}
                    />
                </div>

                {/* Divider */}
                <div className="hidden lg:block w-px h-10 bg-border/60"></div>

                {/* Date Range Filter */}
                <div className="flex-1 w-full relative group">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground group-focus-within:text-foreground transition-colors">
                        <Calendar size={20} />
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsDatePickerOpen(true)}
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-transparent bg-muted/60 dark:bg-muted/20 focus:ring-2 focus:ring-primary/20 focus:border-primary/40 focus:bg-background/40 transition-all outline-none text-foreground text-left cursor-pointer hover:bg-muted"
                    >
                        {formatDateRange(dateRange)}
                    </button>
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground pointer-events-none">
                        <SlidersHorizontal size={16} />
                    </div>
                </div>

                {/* Date Range Picker */}
                <QuickDatePicker
                    currentDate={dateRange.start || new Date()}
                    onDateChange={() => { }} // Not used in range mode
                    view="month"
                    isOpen={isDatePickerOpen}
                    onClose={() => setIsDatePickerOpen(false)}
                    mode="range"
                    dateRange={dateRange}
                    onDateRangeChange={(range) => {
                        onDateRangeChange(range);
                    }}
                />

                {/* Clear All Filters Button */}
                {activeFilterCount > 0 && (
                    <button
                        className="w-full lg:w-auto px-6 py-3 border border-border/60 bg-transparent text-foreground font-semibold rounded-xl hover:bg-muted/60 hover:border-foreground/40 transition-colors active:scale-95 transform duration-100 flex items-center gap-2"
                        onClick={onResetFilters}
                        aria-label="Clear all filters"
                    >
                        <ArrowCounterClockwise size={18} />
                        <span>Clear All</span>
                    </button>
                )}

                {/* Search Button */}
                <button
                    className="w-full lg:w-auto px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 active:scale-95 transform duration-100"
                    onClick={onSearch}
                >
                    Search
                </button>

                {/* Mobile Filters Button */}
                <button
                    className="lg:hidden w-full px-6 py-3 border border-border/60 bg-card text-foreground font-semibold rounded-xl hover:bg-muted/60 transition-colors flex items-center justify-center gap-2"
                    onClick={onFilterClick}
                >
                    <SlidersHorizontal size={18} />
                    <span>Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}</span>
                </button>
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    // Custom comparison for date range
    const dateRangeEqual =
        prevProps.dateRange.start?.getTime() === nextProps.dateRange.start?.getTime() &&
        prevProps.dateRange.end?.getTime() === nextProps.dateRange.end?.getTime();

    return (
        prevProps.searchTerm === nextProps.searchTerm &&
        prevProps.location === nextProps.location &&
        prevProps.activeFilterCount === nextProps.activeFilterCount &&
        prevProps.onFilterClick === nextProps.onFilterClick &&
        dateRangeEqual
    );
});

DiscoveryHeader.displayName = 'DiscoveryHeader';

export default DiscoveryHeader;
