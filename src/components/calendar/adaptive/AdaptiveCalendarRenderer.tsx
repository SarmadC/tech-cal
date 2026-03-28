'use client';

import React, { useMemo } from 'react';
import { EventClickArg, FullCalendar } from '@/types/fullcalendar';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { Event, EventType, AppProfile, MultiDayEvent, MultiDayEventInstance, TrackedEvent } from '@/types';

// Web (Desktop) Components
// import CalendarWithPreview from '../CalendarWithPreview';
import TechCalendarMonthView from '../TechCalendarMonthView';
import TechCalendarWeekView from '../TechCalendarWeekView';
import { TechCalendarDayView } from '../TechCalendarDayView';
import DesktopDiscoveryView from '../desktop/discovery/DesktopDiscoveryView';
import { createDefaultUnifiedFilters, UpdateFilterHandler } from '@/hooks/useUnifiedServerFiltering';

// Mobile Components
import MobileCalendarWeekView from '../mobile/MobileCalendarWeekView';
import MobileCalendarDayView from '../mobile/MobileCalendarDayView';
import MobileCalendarMonthView from '../mobile/MobileCalendarMonthView';

const noopUpdateFilter: UpdateFilterHandler = () => {
  // Legacy discover mode rendered via AdaptiveCalendarRenderer does not use filters.
};

const noopSearch = () => {
  // Legacy discover mode rendered via AdaptiveCalendarRenderer does not perform search.
};

const noopResetFilters = () => {
  // Legacy discover mode rendered via AdaptiveCalendarRenderer does not reset filters.
};

export interface AdaptiveCalendarProps {
  view: string;
  events: (Event | MultiDayEvent)[];
  weekEvents?: MultiDayEvent[];
  dayEvents?: MultiDayEvent[];
  initialDate: Date;
  categories: EventType[];
  profile: AppProfile | null;
  trackedEvents?: TrackedEvent[];
  onEventSelect?: (event: Event | MultiDayEventInstance) => void;
  onEventClick?: (clickInfo: EventClickArg) => void;
  onRefresh?: () => Promise<void>;
  calendarRef?: React.RefObject<FullCalendar | null>;
  className?: string;
  isLoading?: boolean;
}

const AdaptiveCalendarRenderer: React.FC<AdaptiveCalendarProps> = ({
  view,
  events,
  weekEvents,
  dayEvents,
  initialDate,
  categories,
  profile,
  trackedEvents = [],
  onEventSelect,
  onEventClick,
  onRefresh,
  calendarRef,
  className = '',
  isLoading = false,
}) => {
  const { isMobile, isTablet, isTouchDevice, userAgent } = useDeviceDetection();

  // Determine if we should use mobile components
  // Consider both viewport size and touch capability
  const useMobileVersion = isMobile || (isTablet && isTouchDevice);

  // Enhanced mobile detection for specific devices
  const isIOSMobile = userAgent.isIOS && isMobile;
  const isAndroidMobile = userAgent.isAndroid && isMobile;

  // Desktop/Web-optimized components (existing)
  const fallbackDiscoverFilters = useMemo(() => createDefaultUnifiedFilters(), []);

  // Calculate active filter count from filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (fallbackDiscoverFilters.categories.length > 0) count++;
    if (fallbackDiscoverFilters.locations.length > 0) count++;
    if (fallbackDiscoverFilters.searchTerm) count++;
    if (fallbackDiscoverFilters.dateRange.start || fallbackDiscoverFilters.dateRange.end) count++;
    if (fallbackDiscoverFilters.budget !== 'all') count++;
    if (fallbackDiscoverFilters.format !== 'all') count++;
    if (fallbackDiscoverFilters.cost !== 'all') count++;
    if (fallbackDiscoverFilters.difficulty !== 'all') count++;
    if (fallbackDiscoverFilters.availability !== 'all') count++;
    if (fallbackDiscoverFilters.popularity !== 'all') count++;
    if (fallbackDiscoverFilters.duration !== 'all') count++;
    if (fallbackDiscoverFilters.myTracked) count++;
    if (fallbackDiscoverFilters.myNetwork) count++;
    if (fallbackDiscoverFilters.recommended) count++;
    return count;
  }, [fallbackDiscoverFilters]);

  if (useMobileVersion) {
    // Mobile-optimized components
    switch (view) {
      case 'discover':
        // Redirect discover to month view on mobile
        return (
          <MobileCalendarMonthView
            events={events}
            initialDate={initialDate}
            categories={categories}
            profile={profile}
            onEventSelect={onEventSelect}
            onEventClick={onEventClick}
            onRefresh={onRefresh}
            className={className}
            isIOS={isIOSMobile}
            isAndroid={isAndroidMobile}
            isLoading={isLoading}
          />
        );

      case 'week':
        return (
          <MobileCalendarWeekView
            events={weekEvents || (events as MultiDayEvent[])}
            initialDate={initialDate}
            categories={categories}
            profile={profile}
            onEventSelect={onEventSelect}
            onRefresh={onRefresh}
            className={className}
            isIOS={isIOSMobile}
            isAndroid={isAndroidMobile}
            isLoading={isLoading}
          />
        );

      case 'day':
        return (
          <MobileCalendarDayView
            events={dayEvents || (events as MultiDayEvent[])}
            initialDate={initialDate}
            categories={categories}
            profile={profile}
            onEventSelect={onEventSelect}
            onRefresh={onRefresh}
            className={className}
            isIOS={isIOSMobile}
            isAndroid={isAndroidMobile}
            isLoading={isLoading}
          />
        );

      case 'month':
      default:
        return (
          <MobileCalendarMonthView
            events={events}
            initialDate={initialDate}
            categories={categories}
            profile={profile}
            onEventSelect={onEventSelect}
            onEventClick={onEventClick}
            onRefresh={onRefresh}
            className={className}
            isIOS={isIOSMobile}
            isAndroid={isAndroidMobile}
            isLoading={isLoading}
          />
        );
    }
  }

  switch (view) {
    case 'discover':
      return (
        <DesktopDiscoveryView
          events={events as Event[]}
          categories={categories}
          profile={profile}
          trackedEvents={trackedEvents}
          onEventSelect={onEventSelect as (event: Event) => void}
          className={className}
          filters={fallbackDiscoverFilters}
          onUpdateFilter={noopUpdateFilter}
          onSearch={noopSearch}
          totalCount={events.length}
          onResetFilters={noopResetFilters}
          activeFilterCount={activeFilterCount}
        />
      );

    case 'week':
      return (
        <TechCalendarWeekView
          events={weekEvents || (events as MultiDayEvent[])}
          initialDate={initialDate}
          categories={categories}
          profile={profile}
          onEventSelect={onEventSelect}
        />
      );

    case 'day':
      return (
        <TechCalendarDayView
          events={dayEvents || (events as MultiDayEvent[])}
          initialDate={initialDate}
          categories={categories}
          profile={profile}
          onEventSelect={onEventSelect}
        />
      );

    case 'month':
    default:
      return (
        <TechCalendarMonthView
          events={events}
          initialDate={initialDate}
          categories={categories}
          profile={profile}
          onEventSelect={onEventSelect}
          onEventClick={onEventClick}
          calendarRef={calendarRef}
          className={className}
        />
      );
  }
};

export default AdaptiveCalendarRenderer;
