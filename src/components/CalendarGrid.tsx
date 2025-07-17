// src/components/CalendarGrid.tsx (Updated with Countdown Timers)

import { CompactCountdown } from './CountdownTimer';

// Type definitions for the props this component receives
type Event = { 
  id: string; 
  title: string; 
  color: string; 
  start_time: string;
  end_time: string | null;
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
  
  // Helper to check if event is upcoming (within next 7 days)
  const isUpcomingEvent = (startTime: string) => {
    const now = new Date();
    const eventStart = new Date(startTime);
    const daysDiff = (eventStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff >= 0 && daysDiff <= 7;
  };

  // Helper to check if event is happening soon (within 24 hours)
  const isHappeningSoon = (startTime: string) => {
    const now = new Date();
    const eventStart = new Date(startTime);
    const hoursDiff = (eventStart.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursDiff >= 0 && hoursDiff <= 24;
  };

  // Helper to check if event is live
  const isEventLive = (startTime: string, endTime: string | null) => {
    const now = new Date();
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
    return now >= start && now <= end;
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

          return (
            <div
              key={index}
              className={`
                border-r border-b border-gray-200 dark:border-gray-800 p-2 min-h-[120px] 
                ${day.isCurrentMonth ? 'bg-white dark:bg-gray-950' : 'bg-gray-50 dark:bg-gray-900'} 
                ${isTodayClass ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                ${(index + 1) % 7 === 0 ? 'border-r-0' : ''} 
              `}
            >
              <div
                className={`
                  text-sm font-medium mb-1 
                  ${day.isCurrentMonth ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-600'} 
                  ${isTodayClass ? 'text-blue-600 dark:text-blue-400' : ''}
                `}
              >
                {day.date}
              </div>
              
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map(event => {
                  const isLive = isEventLive(event.start_time, event.end_time);
                  const isSoon = isHappeningSoon(event.start_time);
                  const isUpcoming = isUpcomingEvent(event.start_time);

                  return (
                    <div key={event.id} className="relative">
                      {/* Event Badge */}
                      <div
                        onClick={() => onEventClick(event)}
                        className={`
                          text-xs px-2 py-1 rounded text-white truncate cursor-pointer 
                          hover:opacity-90 transition-all relative overflow-hidden
                          ${isLive ? 'animate-pulse' : ''}
                        `}
                        style={{ backgroundColor: event.color }}
                      >
                        {/* Live indicator */}
                        {isLive && (
                          <div className="absolute top-0 right-0 w-2 h-2">
                            <div className="absolute inset-0 bg-red-500 rounded-full animate-ping"></div>
                            <div className="absolute inset-0 bg-red-500 rounded-full"></div>
                          </div>
                        )}
                        
                        {/* Event title */}
                        <div className="flex items-center justify-between">
                          <span className="truncate flex-1">{event.title}</span>
                          {isLive && (
                            <span className="text-xs font-bold ml-1 bg-red-500 px-1 rounded">LIVE</span>
                          )}
                        </div>
                      </div>

                      {/* Countdown for upcoming events */}
                      {!isLive && (isUpcoming || isSoon) && (
                        <div className="mt-1">
                          <CompactCountdown 
                            startTime={event.start_time} 
                            endTime={event.end_time}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {dayEvents.length > 3 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 px-2">
                    <span title={`${dayEvents.length - 3} additional events`}>
                      +{dayEvents.length - 3} more
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}