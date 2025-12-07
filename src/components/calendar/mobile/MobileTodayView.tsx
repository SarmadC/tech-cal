'use client';

import React, { useMemo, useState } from 'react';
import { Event, EventType, AppProfile, TrackedEvent } from '@/types';
import './mobile-calendar.css';
import { Calendar } from '@phosphor-icons/react';
import TodayTaskCard from './components/TodayTaskCard';
import MobileEventDetailPanel from './MobileEventDetailPanel';
import ForYouSection from './sections/ForYouSection';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useUserLocation } from '@/hooks/useUserLocation';
import './sections/discovery.css';

export interface MobileTodayViewProps {
    events: Event[];
    currentDate: Date;
    categories: EventType[];
    profile: AppProfile | null;
    trackedEvents?: TrackedEvent[];
    onEventSelect?: (event: Event) => void;
    onTrackEvent?: (event: Event) => void;
    className?: string;
    showDiscoveryMode?: boolean;
}

const MobileTodayView: React.FC<MobileTodayViewProps> = ({
    events,
    currentDate,
    categories: _categories,
    profile,
    trackedEvents = [],
    onEventSelect,
    onTrackEvent,
    className = '',
    showDiscoveryMode = true
}) => {
    // Get user location for location-aware recommendations
    const { location: userLocation } = useUserLocation(profile);
    // Debug logging
    // Mobile today view events loaded

    // Debug upcoming events filtering
    const now = new Date();
    const _upcomingEvents = events.filter(event => new Date(event.startTime) > now);
    // Mobile today view time and events processed
    const [previewEvent, setPreviewEvent] = useState<Event | null>(null);
    const [_isPreviewVisible, _setIsPreviewVisible] = useState(false);
    // Filter events for today - not used in current implementation
    const _todayEvents = useMemo(() => {
        const today = new Date(currentDate);
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return events
            .filter(event => {
                const eventStart = new Date(event.startTime);
                return eventStart >= today && eventStart < tomorrow;
            })
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    }, [events, currentDate]);

    // Get current local time - not used in current implementation
    const _getCurrentTime = () => {
        const now = new Date();
        return now.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    // Format the main date display using actual current date
    const _formatMainDate = () => {
        const now = new Date();
        const day = now.getDate().toString().padStart(2, '0');
        const month = now.getMonth() + 1;
        const monthStr = month.toString().padStart(2, '0');
        const year = now.getFullYear();

        return { day: `${day}.${monthStr}`, year: year.toString() };
    };

    // Format time for reminders - not used in current implementation
    const _formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    // Event preview handlers
    const handleEventTap = (event: Event) => {
        setPreviewEvent(event);
        _setIsPreviewVisible(true);
        // Also call the parent's onEventSelect if provided
        onEventSelect?.(event);
    };

    const handleClosePreview = () => {
        _setIsPreviewVisible(false);
        setPreviewEvent(null);
    };

    const handleTrackEvent = (event: Event) => {
        onTrackEvent?.(event);
        // Event tracked successfully
    };

    return (
        <div className={`mobile-today-view ${className}`} role="main" aria-label={showDiscoveryMode ? "Discover events" : "Today's calendar view"}>
            {/* No header needed - handled by parent MobileTopNavigation */}


            {showDiscoveryMode ? (
                /* Discovery Mode - New Sectioned Layout */
                <div className="discovery-feed" role="region" aria-label="Discover tech events" data-view="discovery">
                    {/* For You Section */}
                    <ErrorBoundary name="ForYou">
                        <ForYouSection
                            events={events}
                            userProfile={profile}
                            trackedEvents={trackedEvents}
                            onEventSelect={handleEventTap}
                            onTrackEvent={handleTrackEvent}
                            userLocation={userLocation || undefined}
                            limit={5}
                        />
                    </ErrorBoundary>

                    {/* Show empty state if no events at all */}
                    {events.length === 0 && (
                        <div className="no-events-feed discovery-empty">
                            <Calendar size={48} />
                            <div className="no-events-text">No events available for discovery</div>
                            <p className="empty-subtitle">Check back later for new events and recommendations</p>
                        </div>
                    )}
                </div>
            ) : (
                /* Legacy Mode - Original Linear Feed */
                <div className="event-feed" role="region" aria-label="Tech events feed">
                    {/* Events Feed - Show all events for testing */}
                    {events
                        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                        .map((event, index) => (
                            <TodayTaskCard
                                key={`${event.id}-${index}`}
                                event={event}
                                onClick={() => handleEventTap(event)}
                            />
                        ))}

                    {/* Show empty state if no events */}
                    {events.length === 0 && (
                        <div className="no-events-feed">
                            <Calendar size={48} />
                            <div className="no-events-text">No events available</div>
                        </div>
                    )}
                </div>
            )}

            {/* Mobile Event Detail Panel */}
            {previewEvent && (
                <MobileEventDetailPanel
                    event={previewEvent}
                    onClose={handleClosePreview}
                    categories={_categories}
                />
            )}
        </div>
    );
};

export default MobileTodayView;