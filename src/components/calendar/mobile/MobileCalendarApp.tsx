'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import './mobile-calendar.css';
import { Event, EventType, AppProfile, TrackedEvent, enrichWithTracking } from '@/types';
import { useSmartFilters } from '@/hooks/useSmartFilters';
import { useSwipeGestures } from '@/hooks/useSwipeGestures';
import MobileCalendarControls from './MobileCalendarControls';
import MobileCollapsibleCalendar from './MobileCollapsibleCalendar';
import MobileCalendarMonthView from './MobileCalendarMonthView';
import MobileSearchFilter from '../MobileSearchFilter';
import MobileAdvancedGestures from './MobileAdvancedGestures';
import UnifiedMobileNavbar from '@/components/common/UnifiedMobileNavbar';
import { APP_MOBILE_NAV_ITEMS } from '@/constants/navigation';
import MobileBottomNav from '@/components/common/MobileBottomNav';

export interface MobileCalendarAppProps {
    events: Event[];
    currentDate: Date;
    categories: EventType[];
    profile: AppProfile | null;
    trackedEvents?: TrackedEvent[];
    onEventSelect?: (event: Event) => void;
    onEventTrack?: (event: Event) => Promise<void>;
    onDateChange?: (date: Date) => void;
    className?: string;
}

const MobileCalendarApp: React.FC<MobileCalendarAppProps> = ({
    events,
    currentDate,
    categories,
    profile,
    trackedEvents = [],
    onEventSelect,
    onEventTrack: _onEventTrack,
    onDateChange,
    className = ''
}) => {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Use events as TrackedEvent[] if they're already enriched, otherwise convert
    const enrichedEvents: TrackedEvent[] = React.useMemo(() => {
        // Check if events are already TrackedEvent objects
        if (events.length > 0 && 'isTracked' in events[0]) {
            return events as TrackedEvent[];
        }
        // Otherwise, convert to TrackedEvent format
        const trackedSet = new Set(trackedEvents.map(te => te.id));
        return events.map(event => enrichWithTracking(event, trackedSet.has(event.id)));
    }, [events, trackedEvents]);

    // Smart filters integration
    const {
        filters,
        filteredEvents,
        updateFilter,
        resetFilters,
        applyQuickFilter: _applyQuickFilter,
        activeFilterCount
    } = useSmartFilters(enrichedEvents, profile);

    // Default to month view only
    const [isCalendarCollapsed, setIsCalendarCollapsed] = useState(true);

    // Debug logging
    // Mobile calendar app state logged
    const [isSearchFilterOpen, setIsSearchFilterOpen] = useState(false);
    const [localCurrentDate, setLocalCurrentDate] = useState(currentDate);
    const [selectedDate, setSelectedDate] = useState<Date | null>(currentDate);

    // No view switching needed - always month view

    // Sync local date with prop changes
    useEffect(() => {
        setLocalCurrentDate(currentDate);
        setSelectedDate(currentDate);
    }, [currentDate]);

    const handleToggleCalendarCollapse = () => {
        setIsCalendarCollapsed(!isCalendarCollapsed);
    };

    const handleToggleSearchFilter = () => {
        setIsSearchFilterOpen(!isSearchFilterOpen);
    };

    // Navigation handlers
    const handleDateChange = useCallback((date: Date, fromSearch = false) => {
        console.log('MobileCalendarApp: Date change requested:', date, 'fromSearch:', fromSearch);
        setLocalCurrentDate(date);
        setSelectedDate(date);
        onDateChange?.(date);

        // Update URL with selected date
        if (fromSearch) {
            const params = new URLSearchParams(searchParams.toString());
            const dateParam = date.toISOString().split('T')[0];
            params.set('date', dateParam);
            router.push(`/calendar?${params.toString()}`, { scroll: false });
        }
    }, [onDateChange, searchParams, router]);

    const handleNavigate = useCallback((direction: 'prev' | 'next') => {
        const newDate = new Date(localCurrentDate);
        // Always navigate by months in month view
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        handleDateChange(newDate);
    }, [localCurrentDate, handleDateChange]);

    const handleGoToToday = useCallback(() => {
        const today = new Date();
        handleDateChange(today);
    }, [handleDateChange]);

    // Swipe gestures configuration
    const swipeConfig = {
        onSwipeLeft: () => handleNavigate('next'),
        onSwipeRight: () => handleNavigate('prev'),
        threshold: 50,
        preventScroll: false,
        enableMomentum: true,
    };

    const { swipeHandlers: _swipeHandlers } = useSwipeGestures(swipeConfig);


    return (
        <div className={`mobile-calendar-app ${className}`}>
            {/* Unified Mobile Navbar */}
            <UnifiedMobileNavbar
                navItems={APP_MOBILE_NAV_ITEMS}
                fixed={false}
                className="static"
                variant="app"
            />

            {/* Calendar Controls Bar */}
            <MobileCalendarControls
                currentDate={localCurrentDate}
                onToggleSearchFilter={handleToggleSearchFilter}
                onToggleCalendarCollapse={handleToggleCalendarCollapse}
                onDateChange={handleDateChange}
                isCalendarCollapsed={isCalendarCollapsed}
                activeFilterCount={activeFilterCount}
            />

            {/* Collapsible Calendar Grid */}
            <MobileCollapsibleCalendar
                events={filteredEvents}
                currentDate={localCurrentDate}
                categories={categories}
                selectedDate={selectedDate}
                isCalendarCollapsed={isCalendarCollapsed}
                onDateClick={(date) => handleDateChange(date, false)}
                onDateChange={(date) => handleDateChange(date, false)}
            />

            <MobileAdvancedGestures
                onSwipeLeft={() => handleNavigate('next')}
                onSwipeRight={() => handleNavigate('prev')}
                onDoubleTap={() => {
                    // Double tap to go to today
                    handleGoToToday();
                }}
                // Disabled long press to prevent accidental filter opening during scrolling
                // onLongPress={() => {
                //   // Long press to open search filters
                //   handleToggleSearchFilter();
                // }}
                onPullToRefresh={() => {
                    // Pull to refresh events
                    // Refreshing events...
                }}
                enablePullToRefresh={true}
                enableDoubleTap={true}
                enableLongPress={false}
                className="mobile-calendar-content"
            >
                <div
                    id="mobile-calendar-content"
                    role="main"
                    aria-label="Mobile calendar month view"
                >
                    {/* Main Content - Month View Only */}
                    <MobileCalendarMonthView
                        events={filteredEvents}
                        initialDate={localCurrentDate}
                        categories={categories}
                        profile={profile}
                        onEventSelect={onEventSelect}
                        onDateChange={(date) => handleDateChange(date, false)}
                        isCalendarCollapsed={isCalendarCollapsed}
                    />
                </div>
            </MobileAdvancedGestures>

            {/* Mobile Search Filter Overlay */}
            <MobileSearchFilter
                filters={filters}
                onUpdateFilter={updateFilter}
                onResetFilters={resetFilters}
                activeFilterCount={activeFilterCount}
                isOpen={isSearchFilterOpen}
                onClose={() => setIsSearchFilterOpen(false)}
                events={enrichedEvents}
                categories={categories}
            />

            {/* Mobile Bottom Navigation */}
            <MobileBottomNav />
        </div>
    );
};

export default MobileCalendarApp;
