'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Event, EventType, AppProfile } from '@/types';
import { useSmartFilters } from '@/hooks/useSmartFilters';
import { useSwipeGestures } from '@/hooks/useSwipeGestures';
import MobileTopNavigation, { MobileViewType } from './MobileTopNavigation';
import MobileTodayView from './MobileTodayView';
import MobileMultiDayCalendarView from './MobileMultiDayCalendarView';
import MobileEnhancedMonthView from './MobileEnhancedMonthView';
import MobileSearchFilter from '../MobileSearchFilter';
import MobileNavigationControls from './MobileNavigationControls';
import MobileViewEnhancements from './MobileViewEnhancements';
import MobileAdvancedGestures from './MobileAdvancedGestures';

export interface MobileCalendarAppProps {
  events: Event[];
  currentDate: Date;
  categories: EventType[];
  profile: AppProfile | null;
  onEventSelect?: (event: Event) => void;
  onDateChange?: (date: Date) => void;
  className?: string;
}

const MobileCalendarApp: React.FC<MobileCalendarAppProps> = ({
  events,
  currentDate,
  categories,
  profile,
  onEventSelect,
  onDateChange,
  className = ''
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Smart filters integration
  const {
    filters,
    filteredEvents,
    updateFilter,
    resetFilters,
    applyQuickFilter,
    activeFilterCount
  } = useSmartFilters(events, profile);

  // Get mobile view from URL, default to 'today'
  const getMobileViewFromURL = useCallback((): MobileViewType => {
    const mobileView = searchParams.get('mobileView');
    return (mobileView === 'calendar' || mobileView === 'month' || mobileView === 'today') ? mobileView : 'today';
  }, [searchParams]);

  const [currentView, setCurrentView] = useState<MobileViewType>(getMobileViewFromURL());

  // Debug logging
  // Mobile calendar app state logged
  const [isSearchFilterOpen, setIsSearchFilterOpen] = useState(false);
  const [localCurrentDate, setLocalCurrentDate] = useState(currentDate);

  // Sync with URL changes
  useEffect(() => {
    setCurrentView(getMobileViewFromURL());
  }, [searchParams, getMobileViewFromURL]);

  // Sync local date with prop changes
  useEffect(() => {
    setLocalCurrentDate(currentDate);
  }, [currentDate]);

  const handleViewChange = (view: MobileViewType) => {
    setCurrentView(view);
    
    // Update URL with mobile view parameter
    const params = new URLSearchParams(searchParams.toString());
    params.set('mobileView', view);
    
    // Preserve existing date parameter if present
    const dateParam = searchParams.get('date');
    if (dateParam) {
      params.set('date', dateParam);
    }
    
    router.push(`/calendar?${params.toString()}`, { scroll: false });
  };

  const handleToggleSearchFilter = () => {
    setIsSearchFilterOpen(!isSearchFilterOpen);
  };

  // Navigation handlers
  const handleDateChange = useCallback((date: Date) => {
    setLocalCurrentDate(date);
    onDateChange?.(date);
  }, [onDateChange]);

  const handleNavigate = useCallback((direction: 'prev' | 'next') => {
    const newDate = new Date(localCurrentDate);
    
    if (currentView === 'today') {
      // For today view, navigate by days
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    } else {
      // For calendar view, navigate by weeks
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    }
    
    handleDateChange(newDate);
  }, [localCurrentDate, currentView, handleDateChange]);

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
      <MobileTopNavigation
        currentView={currentView}
        onViewChange={handleViewChange}
        onToggleSearchFilter={handleToggleSearchFilter}
        activeFilterCount={activeFilterCount}
      />
      
      {/* Navigation Controls - Only for Calendar view */}
      {currentView === 'calendar' && (
        <MobileNavigationControls
          currentDate={localCurrentDate}
          onDateChange={handleDateChange}
          view="week"
          onNavigate={handleNavigate}
        />
      )}
      
      <MobileAdvancedGestures
        onSwipeLeft={() => handleNavigate('next')}
        onSwipeRight={() => handleNavigate('prev')}
        onDoubleTap={() => {
          // Double tap to go to today
          handleGoToToday();
        }}
        onLongPress={() => {
          // Long press to open search filters
          handleToggleSearchFilter();
        }}
        onPullToRefresh={() => {
          // Pull to refresh events
          // Refreshing events...
        }}
        enablePullToRefresh={true}
        enableDoubleTap={true}
        enableLongPress={true}
        className="mobile-calendar-content"
      >
        <div 
          id="mobile-calendar-content"
          role="tabpanel"
          aria-labelledby={currentView === 'today' ? 'today-tab' : 'calendar-tab'}
        >
          {/* View Enhancements */}
          <MobileViewEnhancements
            currentView={currentView === 'month' ? 'calendar' : currentView}
            currentDate={localCurrentDate}
            events={filteredEvents}
            categories={categories}
            profile={profile}
            onDateChange={handleDateChange}
            onEventSelect={onEventSelect}
          />

          {/* Main Content */}
          {currentView === 'today' ? (
            <MobileTodayView
              events={filteredEvents}
              currentDate={localCurrentDate}
              categories={categories}
              profile={profile}
              onEventSelect={onEventSelect}
            />
          ) : currentView === 'month' ? (
            <MobileEnhancedMonthView
              events={filteredEvents}
              initialDate={localCurrentDate}
              categories={categories}
              profile={profile}
              onEventSelect={onEventSelect}
              onDateChange={handleDateChange}
            />
          ) : (
            <MobileMultiDayCalendarView
              events={filteredEvents}
              currentDate={localCurrentDate}
              categories={categories}
              profile={profile}
              onEventSelect={onEventSelect}
              onDateChange={handleDateChange}
            />
          )}
        </div>
      </MobileAdvancedGestures>

      {/* Mobile Search Filter Overlay */}
      <MobileSearchFilter
        filters={filters}
        onUpdateFilter={updateFilter}
        onResetFilters={resetFilters}
        onApplyQuickFilter={applyQuickFilter}
        activeFilterCount={activeFilterCount}
        isOpen={isSearchFilterOpen}
        onClose={() => setIsSearchFilterOpen(false)}
        events={events.map(event => ({
          id: event.id,
          title: event.title,
          organizer: event.organizer,
          eventTypeId: event.eventTypeId
        }))}
        categories={categories.map(cat => ({
          id: cat.id,
          name: cat.name
        }))}
        onSearchSuggestionSelect={(_suggestion) => {
          // Handle suggestion selection - could filter events or navigate
          // Selected suggestion handled
        }}
      />
    </div>
  );
};

export default MobileCalendarApp;