'use client';

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { Event, EventType, AppProfile } from '@/types';
import { MaterialIcon } from '@/components/ui/Icon';
import MobileEventPreview from './MobileEventPreview';
import { useSwipeGestures } from '@/hooks/useSwipeGestures';
import { getSpeakerAvatarUrl } from '@/services/avatarService';
import { AvatarCircles } from '@/components/ui/avatar-circles';
import { EventService } from '@/services/eventServices';
import { createClient } from '@/utils/supabase/client';

export interface MobileEnhancedWeekViewProps {
  events: Event[];
  currentDate: Date;
  categories: EventType[];
  profile: AppProfile | null;
  onEventSelect?: (event: Event) => void;
  onDateChange?: (date: Date) => void;
  className?: string;
}

const MobileEnhancedWeekView: React.FC<MobileEnhancedWeekViewProps> = ({
  events,
  currentDate,
  categories,
  profile: _profile,
  onEventSelect,
  onDateChange,
  className = ''
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(currentDate);
  const [previewEvent, setPreviewEvent] = useState<Event | null>(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [speakerCounts, setSpeakerCounts] = useState<Record<string, number>>({});
  const [fullSpeakerData, setFullSpeakerData] = useState<Record<string, Array<{ id: string; name: string; photoUrl?: string }>>>({});

  // Sync selectedDate with currentDate when navigating weeks
  useEffect(() => {
    setSelectedDate(currentDate);
  }, [currentDate]);

  // Generate array of days to display (current week starting Sunday)
  const displayDays = useMemo(() => {
    const days = [];
    const startOfWeek = new Date(currentDate);
    const dayOfWeek = startOfWeek.getDay(); // 0 = Sunday
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek); // Go to Sunday

    // Generate 7 days starting from Sunday
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }

    return days;
  }, [currentDate]);

  // Opportunistically fetch speaker counts and full speaker data for events
  useEffect(() => {
    let isCancelled = false;
    const supabase = createClient();
    const fetchSpeakers = async () => {
      const toFetch = events.filter(ev => {
        const localCount = (ev.speakerLineup?.length ?? 0);
        const known = typeof speakerCounts[ev.id] === 'number';
        return !known && localCount <= 4; // only fetch when we might show +n
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

  // Navigation handlers
  const handlePreviousWeek = useCallback(() => {
    const prevWeek = new Date(currentDate);
    prevWeek.setDate(prevWeek.getDate() - 7);
    onDateChange?.(prevWeek);
  }, [currentDate, onDateChange]);

  const handleNextWeek = useCallback(() => {
    const nextWeek = new Date(currentDate);
    nextWeek.setDate(nextWeek.getDate() + 7);
    onDateChange?.(nextWeek);
  }, [currentDate, onDateChange]);

  // Date selection handler
  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
    onDateChange?.(date);
  }, [onDateChange]);

  // Event preview handlers
  const handleEventTap = useCallback((event: Event) => {
    setPreviewEvent(event);
    setIsPreviewVisible(true);
    onEventSelect?.(event);
  }, [onEventSelect]);

  const handleClosePreview = useCallback(() => {
    setIsPreviewVisible(false);
    setPreviewEvent(null);
  }, []);

  // Swipe navigation handlers
  const handleSwipeLeft = useCallback(() => {
    const nextWeek = new Date(currentDate);
    nextWeek.setDate(nextWeek.getDate() + 7);
    onDateChange?.(nextWeek);
  }, [currentDate, onDateChange]);

  const handleSwipeRight = useCallback(() => {
    const prevWeek = new Date(currentDate);
    prevWeek.setDate(prevWeek.getDate() - 7);
    onDateChange?.(prevWeek);
  }, [currentDate, onDateChange]);

  // Configure swipe gestures
  const { swipeHandlers } = useSwipeGestures({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    threshold: 50,
    preventScroll: false,
  });

  // Get all events for the current week, grouped by date
  const weekEvents = useMemo(() => {
    // Get all events that fall within the current week
    const eventsInWeek = events.filter(event => {
      const eventDate = new Date(event.startTime);
      return displayDays.some(day => eventDate.toDateString() === day.toDateString());
    });

    // Group events by date
    const grouped = displayDays.map(day => {
      const dayEvents = eventsInWeek
        .filter(event => {
          const eventDate = new Date(event.startTime);
          return eventDate.toDateString() === day.toDateString();
        })
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

      return {
        date: day,
        events: dayEvents,
        isSelected: day.toDateString() === selectedDate.toDateString()
      };
    }).filter(dayData => dayData.events.length > 0); // Only include days with events

    return grouped;
  }, [events, displayDays, selectedDate]);

  // Get current month/year display
  const monthYear = useMemo(() => {
    return currentDate.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric'
    }).toUpperCase();
  }, [currentDate]);

  return (
    <div className={`mobile-enhanced-week-view ${className}`} role="main" aria-label="Weekly calendar view">

      {/* Week Navigation Header */}
      <div className="week-navigation" role="navigation" aria-label="Week navigation">
        <button
          className="nav-arrow"
          onClick={handlePreviousWeek}
          aria-label="Previous week"
        >
          <MaterialIcon name="chevron_left" size={24} />
        </button>

        <div className="current-period">
          {monthYear}
        </div>

        <button
          className="nav-arrow"
          onClick={handleNextWeek}
          aria-label="Next week"
        >
          <MaterialIcon name="chevron_right" size={24} />
        </button>
      </div>

      {/* Week Date Grid */}
      <div
        className="week-date-grid"
        role="grid"
        aria-label="Week calendar"
        {...swipeHandlers}
      >
        <div className="weekday-headers">
          {['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((dayName) => (
            <div key={dayName} className="weekday-header">
              {dayName}
            </div>
          ))}
        </div>

        <div className="week-dates">
          {displayDays.map((day) => {
            const isToday = day.toDateString() === new Date().toDateString();
            const isSelected = day.toDateString() === selectedDate.toDateString();
            const dayEvents = events.filter(event => {
              const eventDate = new Date(event.startTime);
              return eventDate.toDateString() === day.toDateString();
            });

            return (
              <button
                key={day.toISOString()}
                className={`date-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${dayEvents.length > 0 ? 'has-events' : ''}`}
                onClick={() => handleDateSelect(day)}
                aria-label={`${day.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric'
                })}`}
              >
                <span className="date-number">
                  {day.getDate()}
                </span>
                {dayEvents.length > 0 && (
                  <div className="event-indicator">
                    {dayEvents.slice(0, 1).map((event) => (
                      <div
                        key={event.id}
                        className="event-title-preview"
                        title={event.title}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 1 && (
                      <div className="more-events">
                        +{dayEvents.length - 1} more
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Week Events */}
      <div className="selected-date-events">
        {weekEvents.length > 0 ? (
          <div className="events-list">
            {weekEvents.map((dayData) => (
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
                {dayData.events.map((event) => (
                  <div
                    key={event.id}
                    className="enhanced-event-card"
                    onClick={() => handleEventTap(event)}
                  >
                    <div className="event-card-header">
                      <div className="event-time-badge">
                        {new Date(event.startTime).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
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

                      {/* Speaker Avatar Circles (Magic UI) - only show if speakers exist */}
                      {(() => {
                        // Use fetched full speaker data if available, otherwise fall back to local data
                        const fetchedSpeakers = fullSpeakerData[event.id];
                        let speakers: Array<{ id: string; name: string; photoUrl?: string }> = [];
                        
                        if (fetchedSpeakers && fetchedSpeakers.length > 0) {
                          // Use fetched data (already deduplicated)
                          speakers = fetchedSpeakers;
                        } else {
                          // Fall back to local data
                          const fromLineup = Array.isArray(event.speakerLineup) ? event.speakerLineup : [];
                          const fromAgenda = Array.isArray(event.agenda)
                            ? event.agenda.flatMap((item) => {
                                const many = item.speakers || [];
                                const single = item.speaker ? [item.speaker] : [];
                                return [...many, ...single];
                              })
                            : [];
                          const all = [...fromLineup, ...fromAgenda].filter(Boolean);
                          // Deduplicate by id or name
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
                        
                        // Don't render if there are no real speakers
                        if (speakers.length === 0) {
                          return null;
                        }
                        
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
            <div className="no-events-text">No events this week</div>
            <div className="no-events-subtext">
              {displayDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {displayDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Event Preview */}
      {previewEvent && (
        <MobileEventPreview
          event={previewEvent}
          isVisible={isPreviewVisible}
          onClose={handleClosePreview}
          onTrackEvent={() => {}}
          categories={categories}
        />
      )}
    </div>
  );
};

export default MobileEnhancedWeekView;