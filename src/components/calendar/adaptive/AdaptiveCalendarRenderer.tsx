'use client';

import React from 'react';
import { EventClickArg } from '@fullcalendar/core';
import FullCalendar from '@fullcalendar/react';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { Event, EventType, AppProfile, MultiDayEvent, MultiDayEventInstance } from '@/types';

// Web (Desktop) Components
import CalendarWithPreview from '../CalendarWithPreview';
import TechCalendarWeekView from '../TechCalendarWeekView';
import { TechCalendarDayView } from '../TechCalendarDayView';

// Mobile Components (to be created)
import MobileCalendarWeekView from '../mobile/MobileCalendarWeekView';
import MobileCalendarDayView from '../mobile/MobileCalendarDayView';
import MobileCalendarMonthView from '../mobile/MobileCalendarMonthView';

export interface AdaptiveCalendarProps {
  view: string;
  events: (Event | MultiDayEvent)[];
  weekEvents?: (Event | MultiDayEvent)[];
  dayEvents?: (Event | MultiDayEvent)[];
  initialDate: Date;
  categories: EventType[];
  profile: AppProfile | null;
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
            events={dayEvents || events}
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
          events={dayEvents || events}
          initialDate={initialDate}
          categories={categories}
          profile={profile}
          onEventSelect={onEventSelect}
        />
      );

    case 'month':
    default:
      return (
        <CalendarWithPreview
          events={events}
          onEventClick={onEventClick}
          view={view}
          date={initialDate}
          calendarRef={calendarRef}
          className={className}
        />
      );
  }
};

export default AdaptiveCalendarRenderer;