'use client';

//CalendarSidebar.tsx

import { FC, useMemo, useState, useEffect } from 'react';
import { isTrackedEvent } from '@/types';
import EventHeatmap from './EventHeatmap';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { formatDate, formatTime } from '@/utils/dateUtils';
import { useCalendar } from '@/contexts';
interface SidebarProps {
    onClose?: () => void;
}

const WidgetFallback = () => (
    <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-gray-700 bg-gray-800/50 text-xs text-gray-500">
        Could not load this widget
    </div>
);

const CalendarSidebar: FC<SidebarProps> = ({ onClose }) => {
    // Get data from context instead of props
    const { events, profile, selectEvent } = useCalendar();

    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 640);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const upcomingEvents = useMemo(() => {
        const now = new Date();
        return events
            .filter(event => new Date(event.startTime) > now)
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
            .slice(0, 5);
    }, [events]);

    return (
        <aside className="sidebar-content">
            {/* Header with close button for mobile */}
            <div className="sidebar-header">
                <div className="sidebar-user-info">
                    <div className="sidebar-user-avatar">
                        <span className="text-white font-medium text-sm">
                            {profile?.fullName?.split(' ').map(n => n[0]).join('') || 'U'}
                        </span>
                    </div>
                    <div className="sidebar-user-details">
                        <h2 className="text-white font-semibold" style={{ fontSize: '18px' }}>{profile?.fullName || 'User'}</h2>
                        <p className="text-gray-400 text-sm">Member</p>
                    </div>
                </div>
                {/* Close button - only show on mobile */}
                {onClose && (
                    <button
                        onClick={onClose}
                        className="sidebar-close-button md:hidden"
                        aria-label="Close sidebar"
                        title="Close sidebar"
                        style={{ backgroundColor: 'green', color: 'white', padding: '10px' }}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Event Heatmap - Always Visible */}
            <div className="sidebar-section">
                <ErrorBoundary fallback={<WidgetFallback />}>
                    {events && events.length > 0 ? (
                        <div className="heatmap-container">
                            <EventHeatmap />
                        </div>
                    ) : (
                        <div className="text-gray-500 text-sm">No events to display</div>
                    )}
                </ErrorBoundary>
            </div>

            {/* Upcoming Events - Responsive */}
            <div className="flex-1 sidebar-section">
                <h3 className="sidebar-section-title">Upcoming Events</h3>
                <ErrorBoundary fallback={<WidgetFallback />}>
                    <div className="space-y-3">
                        {events && events.length > 0 ? (
                            upcomingEvents.length > 0 ? (
                                upcomingEvents.map((event) => (
                                    <button
                                        key={event.id}
                                        onClick={() => selectEvent(event)}
                                        className="w-full text-left bg-gray-800/50 rounded-lg p-2 sm:p-3 hover:bg-gray-700/50 transition-colors cursor-pointer"
                                    >
                                        <div className="flex items-start space-x-2 sm:space-x-3">
                                            <div
                                                className="w-2 h-2 rounded-full mt-1 sm:mt-2 flex-shrink-0"
                                                style={{ backgroundColor: event.color || '#3B82F6' }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-white text-xs sm:text-sm font-medium line-clamp-2 mb-1">
                                                    {event.title}
                                                </h4>
                                                <p className="text-gray-400 text-xs mb-1">
                                                    {isMobile 
                                                        ? formatTime(event.startTime, event.timezone)
                                                        : `${formatDate(event.startTime, event.timezone)}, ${formatTime(event.startTime, event.timezone)}`
                                                    }
                                                </p>
                                                <p className="text-gray-500 text-xs line-clamp-1 hidden sm:block">
                                                    {event.organizer}
                                                </p>
                                                {isTrackedEvent(event) && event.isTracked && (
                                                    <div className="flex items-center space-x-1 mt-1">
                                                        <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full" />
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
                            )
                        ) : (
                            <div className="text-gray-500 text-sm text-center py-8">
                                Loading events...
                            </div>
                        )}
                    </div>
                </ErrorBoundary>
            </div>

            {/* Stats Section */}
            <div className="mt-6 pt-6 border-t border-gray-800">
                <ErrorBoundary fallback={<WidgetFallback />}>
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                            <div className="text-white text-xl font-bold">
                                {events ? events.filter(e => isTrackedEvent(e) && e.isTracked).length : 0}
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
        </aside>
    );
};

export default CalendarSidebar;