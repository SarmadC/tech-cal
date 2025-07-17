// src/components/CalendarGrid.tsx (Fixed Integration)

import { CompactCountdown } from './CountdownTimer';
import { hasHappeningNowStatus } from './HappeningNowIndicator';

// Simple Minimal Dots Component (inline for debugging)
const MinimalDots = ({ events }: { events: Array<{ start_time: string; end_time: string | null; title: string }> }) => {
  const now = new Date();
  const statusDots: Array<{ color: string; pulse: boolean; priority: number }> = [];

  events.forEach(event => {
    const start = new Date(event.start_time);
    const end = event.end_time ? new Date(event.end_time) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    const hoursUntilStart = (start.getTime() - now.getTime()) / (1000 * 60 * 60);
    const hoursUntilEnd = (end.getTime() - now.getTime()) / (1000 * 60 * 60);
    const titleLower = event.title.toLowerCase();

    // LIVE EVENTS (highest priority)
    if (now >= start && now <= end) {
      // Short events (livestreams, keynotes)
      if (durationHours <= 4 && (
        titleLower.includes('keynote') ||
        titleLower.includes('livestream') ||
        titleLower.includes('announcement') ||
        titleLower.includes('launch') ||
        titleLower.includes('event') // Added more keywords
      )) {
        statusDots.push({ color: 'bg-red-500', pulse: true, priority: 10 });
        return;
      }

      // MULTI-DAY EVENTS: ONLY SHOW ON FIRST DAY
      if (durationHours > 24) {
        const daysSinceStart = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        
        // Only show indicator on first day (day 0)
        if (daysSinceStart === 0) {
          statusDots.push({ color: 'bg-orange-500', pulse: false, priority: 8 });
        }
        // Don't show anything for subsequent days
        return;
      }

      // Regular in-progress events
      statusDots.push({ color: 'bg-blue-500', pulse: false, priority: 7 });
    }

    // STARTING TODAY
    if (hoursUntilStart > 0 && hoursUntilStart <= 24) {
      statusDots.push({ color: 'bg-green-500', pulse: false, priority: 6 });
    }

    // DEADLINES TODAY
    if ((titleLower.includes('registration') || titleLower.includes('submit') || titleLower.includes('deadline')) && 
        hoursUntilEnd <= 24 && hoursUntilEnd > 0) {
      statusDots.push({ color: 'bg-red-600', pulse: true, priority: 9 });
    }

    // TICKET SALES
    if ((titleLower.includes('ticket') || titleLower.includes('sale')) && 
        hoursUntilEnd <= 24 && hoursUntilEnd > 0) {
      statusDots.push({ color: 'bg-purple-600', pulse: true, priority: 8 });
    }

    // OPEN REGISTRATION/SALES
    if (now >= start && now <= end) {
      if (titleLower.includes('registration') || titleLower.includes('signup')) {
        statusDots.push({ color: 'bg-blue-500', pulse: false, priority: 5 });
      } else if (titleLower.includes('ticket') || titleLower.includes('sale')) {
        statusDots.push({ color: 'bg-purple-500', pulse: false, priority: 4 });
      }
    }
  });

  // Sort by priority and take top 3
  const topDots = statusDots
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3);

  if (topDots.length === 0) return null;

  return (
    <div className="absolute top-1 right-1 flex gap-1">
      {topDots.map((dot, index) => (
        <div
          key={index}
          className={`w-2 h-2 ${dot.color} rounded-full ${dot.pulse ? 'animate-pulse' : ''}`}
        />
      ))}
    </div>
  );
};

// Type definitions for the props this component receives
type Event = { 
  id: string; 
  title: string; 
  color: string; 
  start_time: string;
  end_time: string | null;
  event_type_id?: string;
};
type Day = { date: number; isCurrentMonth: boolean; };

interface CalendarGridProps {
  days: Day[];
  weekDays: string[];
  getEventsForDay: (day: number, isCurrentMonth: boolean) => Event[];
  isToday: (day: number, isCurrentMonth: boolean) => boolean;
  onEventClick: (event: Event) => void;
}

export default function CalendarGrid({
  days,
  weekDays,
  getEventsForDay,
  isToday,
  onEventClick,
}: CalendarGridProps) {
  
  // Helper to check if event is upcoming (within next 7 days) for countdown
  const isUpcomingEvent = (startTime: string) => {
    const now = new Date();
    const eventStart = new Date(startTime);
    const daysDiff = (eventStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff >= 0 && daysDiff <= 7;
  };

  // Helper to check if event is happening soon (within 24 hours) for countdown
  const isHappeningSoon = (startTime: string) => {
    const now = new Date();
    const eventStart = new Date(startTime);
    const hoursDiff = (eventStart.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursDiff >= 0 && hoursDiff <= 24;
  };

  // Helper to filter events for current day only (fix multi-day issue)
  const getEventsForCurrentDay = (events: Event[], targetDate: Date) => {
    return events.filter(event => {
      const eventStart = new Date(event.start_time);
      const eventEnd = event.end_time ? new Date(event.end_time) : eventStart;
      
      // Check if event actually occurs on this specific day
      const eventStartDate = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());
      const eventEndDate = new Date(eventEnd.getFullYear(), eventEnd.getMonth(), eventEnd.getDate());
      const currentDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      
      return currentDate >= eventStartDate && currentDate <= eventEndDate;
    });
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Weekday Header */}
      <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800">
        {weekDays.map(day => (
          <div
            key={day}
            className="py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-800 last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="flex-1 grid grid-cols-7" style={{ gridTemplateRows: `repeat(${days.length / 7}, minmax(0, 1fr))` }}>
        {days.map((day, index) => {
          const dayEvents = getEventsForDay(day.date, day.isCurrentMonth);
          const isTodayClass = isToday(day.date, day.isCurrentMonth);

          // Create target date for this calendar day
          const targetDate = new Date(
            new Date().getFullYear(), 
            new Date().getMonth(), 
            day.date
          );

          // Filter events that actually occur on this specific day
          const actualDayEvents = getEventsForCurrentDay(dayEvents, targetDate);

          // Prepare events for happening now dots (with proper filtering)
          const eventsForDots = actualDayEvents.map(event => ({
            start_time: event.start_time,
            end_time: event.end_time,
            title: event.title
          }));

          // Check if any events have happening now status
          const hasHappeningNowEvents = actualDayEvents.some(event => 
            hasHappeningNowStatus(event.start_time, event.end_time, event.title)
          );

          // Find the most urgent event for countdown (if no happening now status)
          const mostUrgentEvent = actualDayEvents.find(event => {
            const isUpcoming = isUpcomingEvent(event.start_time);
            const isSoon = isHappeningSoon(event.start_time);
            const hasStatus = hasHappeningNowStatus(event.start_time, event.end_time, event.title);
            return !hasStatus && (isUpcoming || isSoon);
          });

          return (
            <div
              key={index}
              className={`
                border-r border-b border-gray-200 dark:border-gray-800 p-2 min-h-[120px] relative
                ${day.isCurrentMonth ? 'bg-white dark:bg-gray-950' : 'bg-gray-50 dark:bg-gray-900'} 
                ${isTodayClass ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                ${(index + 1) % 7 === 0 ? 'border-r-0' : ''} 
              `}
            >
              {/* Day number */}
              <div
                className={`
                  text-sm font-medium mb-2 
                  ${day.isCurrentMonth ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-600'} 
                  ${isTodayClass ? 'text-blue-600 dark:text-blue-400' : ''}
                `}
              >
                {day.date}
              </div>

              {/* MINIMAL DOTS - Always show if there are relevant events */}
              {eventsForDots.length > 0 && (
                <MinimalDots events={eventsForDots} />
              )}
              
              {/* Event badges - show actual events for this day only */}
              <div className="space-y-1">
                {actualDayEvents.slice(0, 3).map(event => (
                  <div
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    className="text-xs px-2 py-1 rounded text-white truncate cursor-pointer hover:opacity-90 transition-all"
                    style={{ backgroundColor: event.color }}
                  >
                    {event.title}
                  </div>
                ))}
                
                {actualDayEvents.length > 3 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 px-2">
                    <span title={`${actualDayEvents.length - 3} additional events`}>
                      +{actualDayEvents.length - 3} more
                    </span>
                  </div>
                )}
              </div>

              {/* Countdown timer for upcoming events (only if no happening now status) */}
              {!hasHappeningNowEvents && mostUrgentEvent && (
                <div className="mt-2 flex justify-center">
                  <CompactCountdown 
                    startTime={mostUrgentEvent.start_time} 
                    endTime={mostUrgentEvent.end_time}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Debug component to test dots in isolation
export function DebugMinimalDots() {
  const testEvents = [
    {
      start_time: new Date().toISOString(), // Live now
      end_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      title: 'Apple Keynote'
    },
    {
      start_time: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // Starting today
      end_time: null,
      title: 'React Conference'
    }
  ];

  return (
    <div className="relative bg-gray-100 w-32 h-32 border rounded">
      <div className="text-sm p-2">Test Day</div>
      <MinimalDots events={testEvents} />
    </div>
  );
}