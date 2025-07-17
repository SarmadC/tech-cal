
import { CompactCountdown } from './CountdownTimer';
import { CalendarDayDots, hasHappeningNowStatus } from './HappeningNowIndicator';

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

          // Prepare events for happening now dots
          const eventsForDots = dayEvents.map(event => ({
            startTime: event.start_time,
            endTime: event.end_time,
            title: event.title,
            eventType: event.event_type_id
          }));

          // Check if any events have happening now status
          const hasHappeningNowEvents = dayEvents.some(event => 
            hasHappeningNowStatus(event.start_time, event.end_time, event.title)
          );

          // Find the most urgent event for countdown (if no happening now status)
          const mostUrgentEvent = dayEvents.find(event => {
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

              {/* Minimal happening now dots (top-right corner) */}
              {hasHappeningNowEvents && (
                <CalendarDayDots events={eventsForDots} />
              )}
              
              {/* Event badges */}
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map(event => (
                  <div
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    className="text-xs px-2 py-1 rounded text-white truncate cursor-pointer hover:opacity-90 transition-all"
                    style={{ backgroundColor: event.color }}
                  >
                    {event.title}
                  </div>
                ))}
                
                {dayEvents.length > 3 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 px-2">
                    <span title={`${dayEvents.length - 3} additional events`}>
                      +{dayEvents.length - 3} more
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