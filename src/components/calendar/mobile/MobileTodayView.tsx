'use client';

import React, { useMemo, useState } from 'react';
import { Event, EventType, AppProfile, TrackedEvent } from '@/types';
import { Calendar } from '@phosphor-icons/react';
import TodayTaskCard from './components/TodayTaskCard';
import MobileEventPreview from './MobileEventPreview';
import { 
  ForYouSection, 
  TrendingSection, 
  NewThisWeekSection, 
  QuickWinsSection 
} from './discovery';
import DiscoveryErrorBoundary from './discovery/DiscoveryErrorBoundary';
import DiscoveryAlgorithmErrorBoundary from './discovery/DiscoveryAlgorithmErrorBoundary';
import { useUserLocation } from '@/hooks/useUserLocation';
import './discovery/discovery.css';

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
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
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
  const formatMainDate = () => {
    const now = new Date();
    const day = now.getDate().toString().padStart(2, '0');
    const month = now.getMonth() + 1;
    const monthStr = month.toString().padStart(2, '0');
    const year = now.getFullYear();
    
    return { day: `${day}.${monthStr}`, year: year.toString() };
  };

  const formatWeekday = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const formatMonthName = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
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

  const { day, year: _year } = formatMainDate();

  // Event preview handlers
  const handleEventTap = (event: Event) => {
    setPreviewEvent(event);
    setIsPreviewVisible(true);
  };

  const handleClosePreview = () => {
    setIsPreviewVisible(false);
    setPreviewEvent(null);
  };

  const handleTrackEvent = (event: Event) => {
    onTrackEvent?.(event);
    // Event tracked successfully
  };

  return (
    <div className={`mobile-today-view ${className}`} role="main" aria-label={showDiscoveryMode ? "Discover events" : "Today's calendar view"}>
      {/* No header needed - handled by parent MobileTopNavigation */}

      {/* Compact Header */}
      <div className="compact-header">
        <div className="app-title">Kure-Cal</div>
        <div className="date-info">
          {formatWeekday()}, {day} {formatMonthName()}
        </div>
      </div>

      {showDiscoveryMode ? (
        /* Discovery Mode - New Sectioned Layout */
        <div className="discovery-feed" role="region" aria-label="Discover tech events">
          {/* For You Section */}
          <DiscoveryErrorBoundary sectionName="For You">
            <DiscoveryAlgorithmErrorBoundary algorithmName="Personalization">
              <ForYouSection
              events={events}
              userProfile={profile}
              trackedEvents={trackedEvents}
              onEventSelect={onEventSelect}
              onTrackEvent={handleTrackEvent}
              userLocation={userLocation || undefined}
              limit={5}
            />
            </DiscoveryAlgorithmErrorBoundary>
          </DiscoveryErrorBoundary>

          {/* Trending Section */}
          <DiscoveryErrorBoundary sectionName="Trending">
            <DiscoveryAlgorithmErrorBoundary algorithmName="Trending">
              <TrendingSection
              events={events}
              onEventSelect={onEventSelect}
              onTrackEvent={handleTrackEvent}
              userLocation={userLocation || undefined}
              limit={5}
            />
            </DiscoveryAlgorithmErrorBoundary>
          </DiscoveryErrorBoundary>

          {/* New This Week Section */}
          <DiscoveryErrorBoundary sectionName="New This Week">
            <DiscoveryAlgorithmErrorBoundary algorithmName="New Events">
              <NewThisWeekSection
              events={events}
              onEventSelect={onEventSelect}
              onTrackEvent={handleTrackEvent}
              limit={4}
            />
            </DiscoveryAlgorithmErrorBoundary>
          </DiscoveryErrorBoundary>

          {/* Quick Wins Section */}
          <DiscoveryErrorBoundary sectionName="Quick Wins">
            <DiscoveryAlgorithmErrorBoundary algorithmName="Quick Wins">
              <QuickWinsSection
              events={events}
              onEventSelect={onEventSelect}
              onTrackEvent={handleTrackEvent}
              limit={4}
            />
            </DiscoveryAlgorithmErrorBoundary>
          </DiscoveryErrorBoundary>

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

      {/* Mobile Event Preview */}
      {previewEvent && (
        <MobileEventPreview
          event={previewEvent}
          isVisible={isPreviewVisible}
          onClose={handleClosePreview}
          onTrackEvent={handleTrackEvent}
          categories={_categories}
        />
      )}
    </div>
  );
};

export default MobileTodayView;