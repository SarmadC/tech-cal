'use client';

import React, { useState, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';
import { EventClickArg } from '@/types/fullcalendar';
import { Event, EventType, AppProfile, MultiDayEventInstance } from '@/types';
import { CaretLeft, CaretRight, ArrowClockwise } from '@phosphor-icons/react';
import { MaterialIcon } from '@/components/ui/Icon';
import MobileEventDetailPanel from './MobileEventDetailPanel';
import { useSwipeGestures } from '@/hooks/useSwipeGestures';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { SkeletonLoader, MonthViewSkeleton } from '@/components/ui/SkeletonLoader';
import { isSameDay, getTodayDate } from '@/utils/dateUtils';
import { getSpeakerAvatarUrl } from '@/services/avatarService';
import { AvatarCircles } from '@/components/ui/avatar-circles';
import { EventService } from '@/services/eventServices';
import { createClient } from '@/utils/supabase/client';

export interface MobileMonthViewProps {
  events: Event[];
  initialDate: Date;
  categories: EventType[];
  profile: AppProfile | null;
  onEventSelect?: (event: Event | MultiDayEventInstance) => void;
  onEventClick?: (clickInfo: EventClickArg) => void;
  onDateChange?: (date: Date) => void;
  onRefresh?: () => Promise<void>;
  className?: string;
  isIOS?: boolean;
  isAndroid?: boolean;
  isLoading?: boolean;
}

interface CalendarDay {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  events: Event[];
  hasEvents: boolean;
  isWeekend: boolean;
}

const MobileMonthView: React.FC<MobileMonthViewProps> = ({
  events,
  initialDate,
  categories,
  profile: _profile,
  onEventSelect,
  onEventClick: _onEventClick,
  onDateChange,
  onRefresh,
  className = '',
  isIOS: _isIOS = false,
  isAndroid: _isAndroid = false,
  isLoading = false,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [previewEvent, setPreviewEvent] = useState<Event | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(initialDate);
  const [speakerCounts, setSpeakerCounts] = useState<Record<string, number>>({});
  const [fullSpeakerData, setFullSpeakerData] = useState<Record<string, Array<{ id: string; name: string; photoUrl?: string }>>>({});

  // Sync currentMonth with initialDate changes (e.g., from search)
  React.useEffect(() => {
    console.log('MobileMonthView: Received initialDate change:', initialDate);
    setCurrentMonth(initialDate);
  }, [initialDate]);

  // Fetch speaker data for events (same as week view)
  React.useEffect(() => {
    let isCancelled = false;
    const supabase = createClient();
    const fetchSpeakers = async () => {
      const toFetch = events.filter(ev => {
        const localCount = (ev.speakerLineup?.length ?? 0);
        const known = typeof speakerCounts[ev.id] === 'number';
        return !known && localCount <= 4;
      });
      for (const ev of toFetch) {
        try {
          const full = await EventService.getEventWithAgenda(ev.id, supabase);
          const fromLineup = Array.isArray(full.speakerLineup) ? full.speakerLineup : [];
          const fromAgenda = Array.isArray(full.agenda)
            ? full.agenda.flatMap(item => [
                ...(item.speakers || []),
                ...(item.speaker ? [item.speaker] : [])
              ])
            : [];
          const seen = new Set<string>();
          const all = [...fromLineup, ...fromAgenda].filter(s => {
            if (!s) return false;
            const key = (s.id || s.name || '').toLowerCase();
            if (!key) return false;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          if (!isCancelled) {
            setSpeakerCounts(prev => ({ ...prev, [ev.id]: all.length }));
            setFullSpeakerData(prev => ({ ...prev, [ev.id]: all }));
          }
        } catch {
          // ignore failed fetches
        }
      }
    };
    fetchSpeakers();
    return () => { isCancelled = true; };
  }, [events, speakerCounts]);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const monthContainerRef = useRef<HTMLDivElement>(null);

  // Generate calendar grid for the month with enhanced data
  const calendarGrid = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // Get first day of the month
    const firstDay = new Date(year, month, 1);
    
    // Get the first day of the calendar grid (might be from previous month)
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    // Generate 42 days (6 weeks) for a complete grid
    const days: CalendarDay[] = [];
    const currentDate = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(currentDate);
      const isCurrentMonth = date.getMonth() === month;
      const isToday = isSameDay(date, getTodayDate());
      const isSelected = selectedDate ? date.toDateString() === selectedDate.toDateString() : false;
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      
      // Get events for this day
      const dayEvents = events.filter(event => {
        const eventStart = new Date(event.startTime);
        return eventStart.toDateString() === date.toDateString();
      });
      
      days.push({
        date: date,
        dayNumber: date.getDate(),
        isCurrentMonth,
        isToday,
        isSelected,
        events: dayEvents,
        hasEvents: dayEvents.length > 0,
        isWeekend,
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  }, [currentMonth, events, selectedDate]);

  // Get events for selected date or all month events grouped by date
  const monthEvents = useMemo(() => {
    if (!events || events.length === 0) return [];
    
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    
    // Process events to split multi-day events into individual day cards for the current month
    const processedEvents: (Event | MultiDayEventInstance)[] = [];
    
    // Process each event in the current month
    for (const event of events) {
      const startDate = new Date(event.startTime);
      const endDate = event.endTime ? new Date(event.endTime) : startDate;
      
      // Check if this is a multi-day event (either explicitly marked or spans multiple days)
      const eventStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const eventEndDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      const daysDiff = Math.ceil((eventEndDate.getTime() - eventStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      const isMultiDay = ('isMultiDay' in event && event.isMultiDay) || daysDiff > 1;
      
      if (isMultiDay) {
        // Find the overlap between the event and the current month
        const overlapStart = new Date(Math.max(eventStartDate.getTime(), monthStart.getTime()));
        const overlapEnd = new Date(Math.min(eventEndDate.getTime(), monthEnd.getTime()));
        
        if (overlapStart <= overlapEnd) {
          // Generate instances for each day in the overlap
          const currentDay = new Date(overlapStart);
          let dayNumber = 1;
          
          while (currentDay <= overlapEnd) {
            const year = currentDay.getFullYear();
            const month = String(currentDay.getMonth() + 1).padStart(2, '0');
            const day = String(currentDay.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            
            // Create day info
            const dayInfo = {
              currentDay: dayNumber,
              totalDays: daysDiff,
              isFirstDay: dayNumber === 1,
              isLastDay: dayNumber === daysDiff,
              continuationType: (dayNumber === 1 ? 'start' : dayNumber === daysDiff ? 'end' : 'middle') as 'start' | 'middle' | 'end'
            };
            
            // Create the instance
            const instance: MultiDayEventInstance = {
              ...event,
              id: `${event.id}-${dateStr}`,
              startTime: `${dateStr}T00:00:00`,
              endTime: `${dateStr}T23:59:59`,
              isInstance: true,
              originalEventId: event.id,
              instanceDate: dateStr,
              dayInfo,
              isMultiDay: true
            };
            
            processedEvents.push(instance);
            
            // Move to next day
            currentDay.setDate(currentDay.getDate() + 1);
            dayNumber++;
          }
        }
      } else {
        // Single-day event - add as is if it's in the current month
        const eventDate = new Date(event.startTime);
        if (eventDate.getFullYear() === year && eventDate.getMonth() === month) {
          processedEvents.push(event);
        }
      }
    }
    
    // Group by date
    const grouped = processedEvents.reduce((acc, event) => {
      const dateKey = new Date(event.startTime).toDateString();
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(event);
      return acc;
    }, {} as Record<string, (Event | MultiDayEventInstance)[]>);
    
    // Convert to sorted array
    return Object.entries(grouped)
      .map(([dateStr, evts]) => ({
        date: new Date(dateStr),
        events: evts.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [events, currentMonth]);

  const _selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    
    return events
      .filter(event => {
        const eventStart = new Date(event.startTime);
        return eventStart.toDateString() === selectedDate.toDateString();
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [events, selectedDate]);

  // Month navigation handlers
  const handlePreviousMonth = useCallback(() => {
    setIsTransitioning(true);
    const prevMonth = new Date(currentMonth);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    setCurrentMonth(prevMonth);
    onDateChange?.(prevMonth);
    
    setTimeout(() => setIsTransitioning(false), 300);
  }, [currentMonth, onDateChange]);

  const handleNextMonth = useCallback(() => {
    setIsTransitioning(true);
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setCurrentMonth(nextMonth);
    onDateChange?.(nextMonth);
    
    setTimeout(() => setIsTransitioning(false), 300);
  }, [currentMonth, onDateChange]);


  // Enhanced gesture handlers
  const { swipeHandlers } = useSwipeGestures({
    onSwipeLeft: handleNextMonth,
    onSwipeRight: handlePreviousMonth,
    threshold: 60,
    preventScroll: false,
    enableMomentum: true,
  });

  // Pull to refresh functionality
  const handleRefresh = useCallback(async () => {
    if (onRefresh) {
      await onRefresh();
    }
    // Default refresh behavior
    await new Promise(resolve => setTimeout(resolve, 1000));
  }, [onRefresh]);

  const {
    pullToRefreshHandlers,
    pullState,
    pullProgress: _pullProgress,
    indicatorOpacity,
    indicatorScale,
    indicatorRotation,
    pullTransform,
  } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
    resistance: 2.5,
    enabled: true,
  });

  // Event handlers
  const handleDateClick = useCallback((date: Date) => {
    setSelectedDate(date);
    onDateChange?.(date);
  }, [onDateChange]);

  const handleEventClick = useCallback((event: Event, e: React.MouseEvent) => {
    e.stopPropagation();
    onEventSelect?.(event);
    setPreviewEvent(event);
  }, [onEventSelect]);


  // Format time for mobile display
  const formatEventTime = useCallback((event: Event) => {
    const start = new Date(event.startTime);
    const hours = start.getHours();
    const minutes = start.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}${minutes > 0 ? ':' + minutes.toString().padStart(2, '0') : ''}${ampm}`;
  }, []);

  // Get event color based on category
  const getEventColor = useCallback((event: Event) => {
    const category = categories.find(cat => cat.id === event.eventTypeId);
    return category?.color || event.color || 'var(--accent-primary)';
  }, [categories]);

  // Get category color for event dots (same logic as week view)
  const getCategoryColor = useCallback((event: Event) => {
    if (event.category?.color) {
      return event.category.color;
    }
    const categoryName = event.category?.name?.toLowerCase();
    switch (categoryName) {
      case 'tech summit':
      case 'summit':
        return '#bfdbfe';
      case 'workshop':
        return '#e9d7ff';
      case 'networking':
        return '#b8ffcc';
      case 'conference':
        return '#a7f3d0';
      case 'webinar':
        return '#fed8ae';
      case 'startup':
        return '#fecaca';
      case 'trade show':
        return '#faf3dd';
      case 'product launch':
        return '#ffa69e';
      case 'training':
        return '#b8f2e6';
      default:
        return '#a78bfa'; // violet fallback
    }
  }, []);

  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Show loading state
  if (isLoading) {
    return (
      <div className={`mobile-enhanced-month-view ${className} loading`}>
        <div className="mobile-month-header">
          <SkeletonLoader className="skeleton-loader" width="200px" height="32px" />
        </div>
        <MonthViewSkeleton />
      </div>
    );
  }

  return (
    <div className={`mobile-enhanced-month-view ${className}`}>
      {/* Pull to Refresh Indicator */}
      {pullState.isPulling && (
        <div 
          className="pull-refresh-indicator mobile-pull-indicator"
          style={{
            '--indicator-opacity': indicatorOpacity,
            '--indicator-transform': `scale(${indicatorScale}) rotate(${indicatorRotation}deg)`,
          } as React.CSSProperties}
        >
          <ArrowClockwise size={24} />
        </div>
      )}
      
      {/* Loading Indicator */}
      {pullState.isRefreshing && (
        <div className="refresh-loading-indicator">
          <ArrowClockwise size={20} className="spinning" />
          <span>Refreshing...</span>
        </div>
      )}

      {/* Modern Month Header */}
      <div className="mobile-month-header-modern mobile-pull-transform"
        {...pullToRefreshHandlers}
        style={{ '--pull-transform': pullTransform } as React.CSSProperties}
      >

        {/* Month Navigation */}
        <div className="month-navigation-modern">
          <button
            className="nav-button-modern"
            onClick={handlePreviousMonth}
            disabled={isTransitioning}
            aria-label="Previous month"
          >
            <CaretLeft size={16} />
          </button>
          
          <div className="month-title-modern">
            <h2 className="month-name">{monthName}</h2>
          </div>
          
          <button
            className="nav-button-modern"
            onClick={handleNextMonth}
            disabled={isTransitioning}
            aria-label="Next month"
          >
            <CaretRight size={16} />
          </button>
        </div>
      </div>

      {/* Modern Calendar Grid */}
      <div 
        className="mobile-calendar-grid-modern mobile-pull-transform"
        ref={scrollContainerRef}
        onTouchStart={swipeHandlers.onTouchStart}
        onTouchMove={swipeHandlers.onTouchMove}
        onTouchEnd={swipeHandlers.onTouchEnd}
        style={{ '--pull-transform': pullTransform } as React.CSSProperties}
      >
        {/* Week day headers */}
        <div className="weekday-headers-modern">
          {weekDays.map(day => (
            <div key={day} className="weekday-header-modern">
              {day.toLowerCase()}
            </div>
          ))}
        </div>

        {/* Calendar days grid */}
        <div 
          className={`calendar-days-modern ${isTransitioning ? 'transitioning' : ''}`}
          ref={monthContainerRef}
        >
          {calendarGrid.map((day, index) => (
            <div
              key={index}
              className={`calendar-day-modern ${
                !day.isCurrentMonth ? 'other-month' : ''
              } ${day.isToday ? 'today' : ''} ${
                day.isSelected ? 'selected' : ''
              } ${day.hasEvents ? 'has-events' : ''} ${
                day.isWeekend ? 'weekend' : ''
              }`}
              onClick={() => handleDateClick(day.date)}
              role="button"
              tabIndex={0}
              aria-label={`${day.date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })}${day.hasEvents ? `, ${day.events.length} events` : ''}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleDateClick(day.date);
                }
              }}
            >
              <div className="day-number-modern">{day.dayNumber}</div>
              
              {/* Multi-colored event indicators by category */}
              {day.hasEvents && (
                <div className="event-indicators-modern">
                  {day.events.slice(0, 3).map((event, eventIndex) => (
                    <div
                      key={`${event.id}-${eventIndex}`}
                      className="event-dot-modern mobile-event-dot"
                      style={{
                        backgroundColor: getCategoryColor(event),
                      }}
                      title={event.title}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Month Events - Show all events grouped by date (similar to week view) */}
      <div className="selected-date-events">
        {monthEvents.length > 0 ? (
          <div className="events-list">
            {monthEvents.map((dayData) => (
              <div key={dayData.date.toISOString()}>
                {/* Date Header */}
                <div className="date-section-header">
                  {dayData.date.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  })}
                </div>

                {/* Events for this date */}
                {dayData.events.map((event, index) => (
                <div
                  key={`${event.id}-${index}`}
                  className="enhanced-event-card"
                  onClick={(e) => handleEventClick(event, e)}
                  style={{
                    '--event-color': getEventColor(event),
                  } as React.CSSProperties}
                >
                  <div className="event-card-header">
                    <div className="event-time-badge">
                      {formatEventTime(event)}
                    </div>
                    <div className="event-logo">
                      {event.organization?.logo ? (
                        <Image
                          src={event.organization.logo}
                          alt={`${event.organizer || event.title} logo`}
                          width={40}
                          height={40}
                          unoptimized
                        />
                      ) : (
                        <div className="event-logo-placeholder">
                          <MaterialIcon name="event" size={20} />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="event-content">
                    <div className="event-title">
                      {event.title}
                    </div>

                    <div className="event-metadata">
                      {event.location && (
                        <div className="event-location">
                          <MaterialIcon name="location" size={14} />
                          <span>{event.location}</span>
                        </div>
                      )}
                      {event.organizer && (
                        <div className="event-organizer">
                          <MaterialIcon name="building" size={14} />
                          <span>{event.organizer}</span>
                        </div>
                      )}
                    </div>

                    {/* Speaker Avatar Circles - with fetched data */}
                    {(() => {
                      const fetchedSpeakers = fullSpeakerData[event.id];
                      let speakers: Array<{ id: string; name: string; photoUrl?: string }> = [];
                      
                      if (fetchedSpeakers && fetchedSpeakers.length > 0) {
                        speakers = fetchedSpeakers;
                      } else {
                        const fromLineup = Array.isArray(event.speakerLineup) ? event.speakerLineup : [];
                        const fromAgenda = Array.isArray(event.agenda)
                          ? event.agenda.flatMap((item) => {
                              const many = item.speakers || [];
                              const single = item.speaker ? [item.speaker] : [];
                              return [...many, ...single];
                            })
                          : [];
                        const all = [...fromLineup, ...fromAgenda].filter(Boolean);
                        const uniqueByKey = (arr: typeof all) => {
                          const seen = new Set<string>();
                          const out: typeof all = [];
                          for (const s of arr) {
                            const key = (s.id || s.name || '').toLowerCase();
                            if (!key) continue;
                            if (!seen.has(key)) {
                              seen.add(key);
                              out.push(s);
                            }
                          }
                          return out;
                        };
                        speakers = uniqueByKey(all);
                      }
                      
                      if (speakers.length === 0) return null;
                      
                      const top = speakers.slice(0, 4);
                      const totalCount = typeof speakerCounts[event.id] === 'number' ? speakerCounts[event.id]! : speakers.length;
                      const extra = Math.max(0, totalCount - 4);
                      
                      return (
                        <div className="event-speakers-section">
                          <AvatarCircles
                            className="avatar-circles"
                            avatarUrls={top.map((speaker) => ({
                              imageUrl: getSpeakerAvatarUrl(speaker, 40),
                              profileUrl: '#',
                            }))}
                            numPeople={extra}
                          />
                          {speakers.length <= 2 && (
                            <span className="speakers-names">
                              {speakers.map(s => s.name).join(', ')}
                            </span>
                          )}
                        </div>
                      );
                    })()}

                    {/* Attendee Count */}
                    {event.attendeeCount && event.attendeeCount > 0 && (
                      <div className="event-attendees">
                        <MaterialIcon name="people" size={14} />
                        <span>{event.attendeeCount.toLocaleString()} attending</span>
                      </div>
                    )}
                  </div>
                </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="no-events-state">
            <MaterialIcon name="event_available" size={48} />
            <div className="no-events-text">No events this month</div>
            <div className="no-events-subtext">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
          </div>
        )}
      </div>

      {/* Event Detail Panel */}
      {previewEvent && (
        <MobileEventDetailPanel
          event={previewEvent}
          onClose={() => setPreviewEvent(null)}
          categories={categories}
        />
      )}
    </div>
  );
};

export default MobileMonthView;
