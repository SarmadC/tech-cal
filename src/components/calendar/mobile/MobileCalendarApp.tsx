'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Event, EventType, AppProfile } from '@/types';
import MobileTopNavigation, { MobileViewType } from './MobileTopNavigation';
import MobileTodayView from './MobileTodayView';
import MobileMultiDayCalendarView from './MobileMultiDayCalendarView';
import './mobile-today-calendar.css';

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
  
  // Get mobile view from URL, default to 'today'
  const getMobileViewFromURL = useCallback((): MobileViewType => {
    const mobileView = searchParams.get('mobileView');
    return (mobileView === 'calendar' || mobileView === 'today') ? mobileView : 'today';
  }, [searchParams]);

  const [currentView, setCurrentView] = useState<MobileViewType>(getMobileViewFromURL());

  // Sync with URL changes
  useEffect(() => {
    setCurrentView(getMobileViewFromURL());
  }, [searchParams, getMobileViewFromURL]);

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


  return (
    <div className={`mobile-calendar-app ${className}`}>
      <MobileTopNavigation
        currentView={currentView}
        onViewChange={handleViewChange}
      />
      
      <div 
        className="mobile-calendar-content"
        id="mobile-calendar-content"
        role="tabpanel"
        aria-labelledby={currentView === 'today' ? 'today-tab' : 'calendar-tab'}
      >
        {currentView === 'today' ? (
          <MobileTodayView
            events={events}
            currentDate={currentDate}
            categories={categories}
            profile={profile}
            onEventSelect={onEventSelect}
          />
        ) : (
          <MobileMultiDayCalendarView
            events={events}
            currentDate={currentDate}
            categories={categories}
            profile={profile}
            onEventSelect={onEventSelect}
            onDateChange={onDateChange}
          />
        )}
      </div>
    </div>
  );
};

export default MobileCalendarApp;