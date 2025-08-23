'use client';

//CalendarSidebar.tsx

import { FC, useMemo } from 'react';
import { Event, EventType, isTrackedEvent, TrackedEvent } from '@/types';
import MiniCalendar from './MiniCalendar';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { formatDate, formatTime } from '@/utils/dateUtils';
interface SidebarProps {
    currentDate: Date;
    setCurrentDate: (date: Date) => void;
    categories: EventType[];
    user: { name: string; role: string };
    events: (Event | TrackedEvent)[];
    onSelectEvent?: (event: Event) => void;
    monthlyEventCounts?: Map<string, Map<number, number>>;
}

const WidgetFallback = () => (
    <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-gray-700 bg-gray-800/50 text-xs text-gray-500">
        Could not load this widget
    </div>
);

const CalendarSidebar: FC<SidebarProps> = ({
    currentDate,
    setCurrentDate,
    user,
    events,
    onSelectEvent,
    monthlyEventCounts
}) => {

    const upcomingEvents = useMemo(() => {
        const now = new Date();
        return events
            .filter(event => new Date(event.startTime) > now)
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
            .slice(0, 5);
    }, [events]);

    return (
        <aside className="w-80 bg-[#1e1e1e] border-r border-gray-800 p-6 flex flex-col">
            { }
            <div className="mb-8">
                <div className="flex items-center space-x-3 mb-2">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium text-sm">
                            {user.name.split(' ').map(n => n[0]).join('')}
                        </span>
                    </div>
                    <div>
                        <h2 className="text-white font-semibold">{user.name}</h2>
                        <p className="text-gray-400 text-sm">{user.role}</p>
                    </div>
                </div>
            </div>

            {/* Mini Calendar */}
            <div className="mb-8">
                <h3 className="text-white text-lg font-semibold mb-4">Calendar</h3>
                <ErrorBoundary fallback={<WidgetFallback />}>
                    <MiniCalendar
                        date={currentDate}
                        setDate={setCurrentDate}
                        monthlyEventCounts={monthlyEventCounts}
                        currentDate={currentDate}
                    />
                </ErrorBoundary>
            </div>

            {/* Upcoming Events */}
            <div className="flex-1">
                <h3 className="text-white text-lg font-semibold mb-4">Upcoming Events</h3>
                <ErrorBoundary fallback={<WidgetFallback />}>
                    <div className="space-y-3">
                        {upcomingEvents.length > 0 ? (
                            upcomingEvents.map((event) => (
                                <button
                                    key={event.id}
                                    onClick={() => onSelectEvent?.(event)}
                                    className="w-full text-left bg-gray-800/50 rounded-lg p-3 hover:bg-gray-700/50 transition-colors cursor-pointer"
                                >
                                    <div className="flex items-start space-x-3">
                                        <div
                                            className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                                            style={{ backgroundColor: event.color || '#3B82F6' }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-white text-sm font-medium line-clamp-2 mb-1">
                                                {event.title}
                                            </h4>
                                            <p className="text-gray-400 text-xs mb-1">
                                                {`${formatDate(event.startTime, { month: 'short', day: 'numeric' })}, ${formatTime(event.startTime)}`}
                                            </p>
                                            <p className="text-gray-500 text-xs line-clamp-1">
                                                {event.organizer}
                                            </p>
                                            { }
                                            {isTrackedEvent(event) && event.isTracked && (
                                                <div className="flex items-center space-x-1 mt-1">
                                                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                                                    <span className="text-green-400 text-xs">Tracked</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))
                        ) : (
                            <div className="text-gray-500 text-sm text-center py-8">
                                No upcoming events
                            </div>
                        )}
                    </div>
                </ErrorBoundary>
            </div>

            { }
            <div className="mt-6 pt-6 border-t border-gray-800">
                <ErrorBoundary fallback={<WidgetFallback />}>
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                            <div className="text-white text-xl font-bold">
                                { }
                                {events.filter(e => isTrackedEvent(e) && e.isTracked).length}
                            </div>
                            <div className="text-gray-400 text-xs">Tracked</div>
                        </div>
                        <div>
                            <div className="text-white text-xl font-bold">
                                {upcomingEvents.length}
                            </div>
                            <div className="text-gray-400 text-xs">Upcoming</div>
                        </div>
                    </div>
                </ErrorBoundary>
            </div>

            { }
            <div className="mt-6 p-3 bg-blue-900/20 border border-blue-800/50 rounded-lg">
                <p className="text-blue-300 text-xs text-center">
                    💡 Use <strong>Smart Filters</strong> to find events by format, cost, difficulty, and more!
                </p>
            </div>
        </aside>
    );
};

export default CalendarSidebar;