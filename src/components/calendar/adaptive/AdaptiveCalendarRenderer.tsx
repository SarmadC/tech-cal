'use client';

import React from 'react';
import { EventClickArg, FullCalendar } from '@/types/fullcalendar';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { Event, EventType, AppProfile, MultiDayEvent, MultiDayEventInstance, TrackedEvent } from '@/types';

// Web (Desktop) Components
// import CalendarWithPreview from '../CalendarWithPreview';
import TechCalendarMonthView from '../TechCalendarMonthView';
import TechCalendarWeekView from '../TechCalendarWeekView';
import { TechCalendarDayView } from '../TechCalendarDayView';
import DesktopDiscoveryView from '../desktop/discovery/DesktopDiscoveryView';

// Mobile Components
import MobileCalendarWeekView from '../mobile/MobileCalendarWeekView';
import MobileCalendarDayView from '../mobile/MobileCalendarDayView';
import MobileCalendarMonthView from '../mobile/MobileCalendarMonthView';
import MobileTodayView from '../mobile/MobileTodayView';

export interface AdaptiveCalendarProps {
  view: string;
  events: (Event | MultiDayEvent)[];
  weekEvents?: (Event | MultiDayEvent)[];
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

  if (useMobileVersion) {
    // Mobile-optimized components
    switch (view) {
      case 'discover':
      case 'today':
        return (
          <MobileTodayView
            events={events as Event[]}
            currentDate={initialDate}
            categories={categories}
            profile={profile}
            trackedEvents={trackedEvents}
            onEventSelect={onEventSelect as (event: Event) => void}
            showDiscoveryMode={true}
            className={className}
          />
        );

      case 'week':
        return (
          <MobileCalendarWeekView
            events={weekEvents || events}
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

  // Desktop/Web-optimized components (existing)
  switch (view) {
    case 'discover':
    case 'today':
      return (
        <DesktopDiscoveryView
          events={events as Event[]}
          categories={categories}
          profile={profile}
          trackedEvents={trackedEvents}
          onEventSelect={onEventSelect as (event: Event) => void}
          className={className}
        />
      );

    case 'week':
      return (
        <TechCalendarWeekView
          events={weekEvents || events}
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