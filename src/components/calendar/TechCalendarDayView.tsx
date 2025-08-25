'use client';

import React, { useState, useMemo, useRef } from 'react';
import { Users, Globe, Monitor, MapPin, Clock, HelpCircle } from 'lucide-react';
import { Event, EventType, AppProfile, MultiDayEvent, isEventTracked, MultiDayEventInstance } from '@/types';
import EventPreviewCard from './EventPreviewCard';
import '@/app/styles/tech-day-view.css';
import { processEventsForDayView } from '@/utils/multiDayEventUtils';

import { formatTime, isEventLive } from '@/utils/dateUtils';

const getIconForCategory = (categoryName: string) => {
    const name = (categoryName || '').toLowerCase();
    if (name.includes('conference')) return Users;
    if (name.includes('workshop') || name.includes('training')) return Monitor;
    if (name.includes('webinar')) return Globe;
    if (name.includes('networking') || name.includes('meetup')) return MapPin;
    return HelpCircle;
};

export interface TechCalendarDayViewProps {
    events: Event[] | MultiDayEvent[];
    initialDate: Date;
    categories: EventType[];
    profile: AppProfile | null;
    onEventSelect?: (event: Event) => void;
}

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => ({ hour: i }));

const getVisualEventInfo = (event: Event | MultiDayEventInstance) => {
    const start = new Date(event.startTime);
    const end = event.endTime ? new Date(event.endTime) : new Date(start.getTime() + 60 * 60 * 1000);

    // --- THE FIX IS HERE ---
    // Use getUTCHours() and getUTCMinutes() to be consistent with our UTC date strings.
    const startDecimal = start.getUTCHours() + start.getUTCMinutes() / 60;
    let endDecimal = end.getUTCHours() + end.getUTCMinutes() / 60;

    // Handle events spanning midnight correctly (logic remains the same)
    if (endDecimal < startDecimal) {
        endDecimal += 24;
    }
    if (endDecimal === 0 && end.getUTCDate() !== start.getUTCDate()) {
        endDecimal = 24;
    }

    // This calculation is now based on consistent UTC values
    const startRow = Math.round(startDecimal * 2) + 1;
    const endRow = Math.round(endDecimal * 2) + 1;
    // --- END OF FIX ---

    const span = endRow - startRow;

    const isInstance = 'isInstance' in event && event.isInstance;
    const dayInfo = isInstance ? (event as MultiDayEventInstance).dayInfo : undefined;

    return {
        startRow,
        endRow,
        span,
        isContinuingFromPreviousDay: dayInfo ? !dayInfo.isFirstDay : false,
        isContinuingToNextDay: dayInfo ? !dayInfo.isLastDay : false,
        dayNumber: dayInfo?.currentDay || 1,
        isActuallyMultiDay: dayInfo ? dayInfo.totalDays > 1 : false,
    };
};

const EventCard: React.FC<{
    event: Event;
    onClick: () => void;
    onHover: (e: React.MouseEvent) => void;
    onLeave: () => void;
}> = ({ event, onClick, onHover, onLeave }) => {
    const visualInfo = getVisualEventInfo(event);
    const live = isEventLive(event.startTime, event.endTime);

    // Pass the color to the CSS file via a variable
    const cardStyle: React.CSSProperties = {
        ['--event-color' as string]: event.category?.color || '#6B7280',
    };

    const cardClasses = ['event-card', live ? 'live' : '', isEventTracked(event) ? 'tracked' : ''].filter(Boolean).join(' ');

    return (
        <div style={cardStyle} className={cardClasses} onClick={onClick} onMouseEnter={onHover} onMouseLeave={onLeave} >
            <div className="event-title">{event.title}</div>
            <div className="event-time"><Clock size={12} /><span>{visualInfo.isContinuingFromPreviousDay ? "Continues" : formatTime(event.startTime, event.timezone)}</span></div>
            {visualInfo.span > 4 && <div className="event-organizer">{event.organizer}</div>}
        </div>
    );
};

export function TechCalendarDayView({ events, initialDate, categories, onEventSelect }: TechCalendarDayViewProps) {
    const [previewEvent, setPreviewEvent] = useState<Event | null>(null);
    const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 });
    const [isPreviewVisible, setIsPreviewVisible] = useState(false);
    const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

    const dayEvents = useMemo(() => processEventsForDayView(events as MultiDayEvent[], initialDate), [events, initialDate]);

    const categoryColumnMap = useMemo(() => {
        const map = new Map<string, number>();
        categories.forEach((cat, index) => map.set(cat.id, index + 2));
        return map;
    }, [categories]);

    // Handlers can remain the same
    const handleEventClick = (event: Event) => {
        setIsPreviewVisible(false);
        onEventSelect?.(event);
    };
    const handleEventHover = (event: Event, mouseEvent: React.MouseEvent) => {
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        const rect = mouseEvent.currentTarget.getBoundingClientRect();
        setPreviewEvent(event);
        setPreviewPosition({ x: rect.right + 10, y: rect.top });
        setIsPreviewVisible(true);
    };
    const handleEventLeave = () => {
        hideTimerRef.current = setTimeout(() => setIsPreviewVisible(false), 300);
    };
    const handlePreviewHover = () => {
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };

    const gridColsStyle = { gridTemplateColumns: `100px repeat(${categories.length}, 1fr)` };

    return (
        <div className="flex h-full tech-day-view">
            <div className="flex-1 relative">
                <div className="category-header-container" style={gridColsStyle}>
                    <div className="category-header">Time</div>
                    {categories.map(category => {
                        const eventCount = dayEvents.filter(e => e.eventTypeId === category.id).length;
                        const Icon = getIconForCategory(category.name);
                        return (
                            <div key={category.id} className="category-header">
                                <div className="category-title"><Icon size={16} /><span>{category.name}</span></div>
                                <div className="category-count">{eventCount} event{eventCount !== 1 ? 's' : ''}</div>
                            </div>
                        );
                    })}
                </div>

                {/* THE FINAL UNIFIED GRID STRUCTURE */}
                <div className="tech-day-view-grid-container" style={gridColsStyle}>
                    {/* Render horizontal lines first (background) */}
                    {Array.from({ length: 48 }).map((_, i) => (
                        <div key={`line-${i}`} className="time-grid-line" style={{ gridRow: i + 1 }} />
                    ))}

                    {/* Render time labels on top of the lines */}
                    {TIME_SLOTS.map(slot => (
                        <div key={slot.hour} className="time-label" style={{ gridRow: `${slot.hour * 2 + 1}` }}>
                            <div>
                                <div className="font-medium">{formatTime(`2000-01-01T${slot.hour.toString().padStart(2, '0')}:00:00`).split(' ')[0]}</div>
                                <div>{formatTime(`2000-01-01T${slot.hour.toString().padStart(2, '0')}:00:00`).split(' ')[1]}</div>
                            </div>
                        </div>
                    ))}
                    {/* Add the final 12:00 AM label for the end of the day */}
                    <div className="time-label" style={{ gridRow: 49 }}>
                        <div>
                            <div className="font-medium">12:00</div>
                            <div>AM</div>
                        </div>
                    </div>

                    {/* Render event cards last, so they are on top */}
                    {dayEvents.map(event => {
                        const gridColumn = categoryColumnMap.get(event.eventTypeId);
                        if (!gridColumn) return null;

                        const { startRow, endRow } = getVisualEventInfo(event);

                        return (
                            <div
                                key={event.id}
                                style={{
                                    gridColumn: gridColumn,
                                    gridRow: `${startRow} / ${endRow}`
                                }}
                                className="h-full p-px"
                            >
                                <EventCard
                                    event={event}
                                    onClick={() => handleEventClick(event)}
                                    onHover={(e) => handleEventHover(event, e)}
                                    onLeave={handleEventLeave}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>

            {previewEvent && (<EventPreviewCard event={previewEvent} isVisible={isPreviewVisible} position={previewPosition} onClose={handleEventLeave} onHover={handlePreviewHover} onLeave={handleEventLeave} />)}
        </div>
    );
}