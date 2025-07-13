// src/components/CalendarGrid.tsx

type Event = { id: string; title: string; color: string; };
type Day = { date: number; isCurrentMonth: boolean; };

interface CalendarGridProps {
  days: Day[];
  weekDays: string[];
  getEventsForDay: (day: number, isCurrentMonth: boolean) => Event[];
  isToday: (day: number, isCurrentMonth: boolean) => boolean;
  onEventClick: (event: Event) => void;
}

export default function CalendarGrid({ days, weekDays, getEventsForDay, isToday, onEventClick }: CalendarGridProps) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
        {weekDays.map(day => (
          <div key={day} className="py-3 text-center text-sm font-medium text-gray-700 border-r border-gray-200 last:border-r-0">
            {day}
          </div>
        ))}
      </div>
      <div className="flex-1 grid grid-cols-7 grid-rows-5">
        {days.map((day, index) => {
          const dayEvents = getEventsForDay(day.date, day.isCurrentMonth);
          const todayClass = isToday(day.date, day.isCurrentMonth);
          return (
            <div
              key={index}
              className={`border-r border-b border-gray-200 p-2 min-h-[120px] last:border-r-0 ${day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'} ${todayClass ? 'bg-blue-50' : ''}`}
            >
              <div className={`text-sm font-medium mb-1 ${day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'} ${todayClass ? 'text-blue-600' : ''}`}>
                {day.date}
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map(event => (
                  <div key={event.id} onClick={() => onEventClick(event)} className="text-xs px-2 py-1 rounded text-white truncate cursor-pointer hover:opacity-90 transition-opacity" style={{ backgroundColor: event.color }}>
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-gray-500 px-2">+{dayEvents.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}