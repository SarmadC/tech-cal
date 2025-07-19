// src/components/CalendarGrid.tsx (Corrected Version)

import { CalendarDayDots } from './HappeningNowIndicator';

// --- Type Definitions ---
// 1. UPDATED: Event type now matches EnrichedEvent from page.tsx
type Event = {
  id: string;
  event_type_id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string | null;
  organizer: string;
  location: string;
  status: string;
  source_url: string;
  livestream_url: string | null;
  color: string;
};

type Day = { date: number; isCurrentMonth: boolean; };

// 2. UPDATED: Props interface now includes selection handlers and state
interface CalendarGridProps {
  days: Day[];
  weekDays: string[];
  getEventsForDay: (day: number, isCurrentMonth: boolean) => Event[];
  isToday: (day: number, isCurrentMonth: boolean) => boolean;
  onEventClick: (event: Event, ctrlKey: boolean, shiftKey: boolean) => void; // Signature now matches handleEventClick
  isSelected: (eventId: string) => boolean;
  selectedCount: number;
}

export default function CalendarGrid({
  days,
  weekDays,
  getEventsForDay,
  isToday,
  onEventClick,
  isSelected,
  selectedCount: _selectedCount,
}: CalendarGridProps) {

  
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
                border-r border-b border-gray-200 dark:border-gray-800 p-2 min-h-[120px] relative
                ${day.isCurrentMonth ? 'bg-white dark:bg-gray-950' : 'bg-gray-50 dark:bg-gray-900'} 
                ${isTodayClass ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                ${(index + 1) % 7 === 0 ? 'border-r-0' : ''} 
              `}
            >
              <div
                className={`
                  text-sm font-medium mb-2 
                  ${day.isCurrentMonth ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-600'} 
                  ${isTodayClass ? 'text-blue-600 dark:text-blue-400' : ''}
                `}
              >
                {day.date}
              </div>

              <CalendarDayDots events={dayEvents} />
              
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map(event => {
                  const selected = isSelected(event.id);
                  return (
                    <div
                      key={event.id}
                      // 3. UPDATED: onClick now passes the MouseEvent to the handler
                      onClick={(e: React.MouseEvent) => onEventClick(event, e.ctrlKey || e.metaKey, e.shiftKey)}
                      className={`
                        text-xs px-2 py-1 rounded text-white truncate cursor-pointer transition-all
                        ${selected ? 'ring-2 ring-offset-1 ring-blue-500 transform scale-105 shadow-md' : ''}
                      `}
                      style={{ backgroundColor: event.color }}
                      title={event.title}
                    >
                      {event.title}
                    </div>
                  );
                })}
                
                {dayEvents.length > 3 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 px-2">
                    +{dayEvents.length - 3} more
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