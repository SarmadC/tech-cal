'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Event, EventType, AppProfile, MultiDayEvent } from '@/types';
import EventPreviewCard from './EventPreviewCard';
import { EventCard } from './shared/EventCard';
import '@/app/styles/tech-day-view.css';
import '@/app/styles/event-card.css';
import { processEventsForDayView } from '@/utils/multiDayEventUtils';
import {
    getIconForCategory,
    getEventVisualInfo,
    createCategoryColumnMap,
    calculateOverlapLayout,
    EventLayoutInfo
} from '@/utils/eventViewUtils';
import { formatTime } from '@/utils/dateUtils';
import { getPillColor } from '@/utils/pillColorUtils';
import { getCategoryColor } from '@/utils/eventUtils';

export interface TechCalendarDayViewProps {
    events: MultiDayEvent[];
    initialDate: Date;
    categories: EventType[];
    profile: AppProfile | null;
    onEventSelect?: (event: Event) => void;
}

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => ({ hour: i }));

export function TechCalendarDayView({ events, initialDate, categories, onEventSelect }: TechCalendarDayViewProps) {
    const [previewEvent, setPreviewEvent] = useState<Event | null>(null);
    const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 });
    const [isPreviewVisible, setIsPreviewVisible] = useState(false);
    const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

    const dayEvents = useMemo(() => {
        // Use proper day view processing for multi-day events
        const processedEvents = processEventsForDayView(events, initialDate);

        console.log('Day view events processed:', {
            originalEvents: events.length,
            processedEvents: processedEvents.length,
            viewDate: initialDate.toDateString()
        });

        return processedEvents;
    }, [events, initialDate]);

    const categoryColumnMap = useMemo(() => {
        return createCategoryColumnMap(categories);
    }, [categories]);

    // Calculate overlap layouts for each category column
    const layoutsByCategory = useMemo(() => {
        const layouts = new Map<string, Map<string, EventLayoutInfo>>();

        categories.forEach(category => {
            // Filter events for this specific category
            const categoryEvents = dayEvents.filter(e => e.eventTypeId === category.id);
            // Calculate layout for these events
            const layout = calculateOverlapLayout(categoryEvents);
            layouts.set(category.id, layout);
        });

        return layouts;
    }, [dayEvents, categories]);

    // Handlers
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

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (hideTimerRef.current) {
                clearTimeout(hideTimerRef.current);
            }
        };
    }, []);

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
                    {Array.from({ length: 49 }).map((_, i) => (
                        <div key={`line-${i}`} className="time-grid-line" style={{ gridRow: i + 1 }} />
                    ))}

                    {/* Render time labels on top of the lines */}
                    {TIME_SLOTS.map(slot => (
                        <div key={slot.hour} className="time-label" style={{ gridRow: `${slot.hour * 2 + 2}` }}>
                            <div>
                                <div className="font-medium">{formatTime(`2000-01-01T${slot.hour.toString().padStart(2, '0')}:00:00`).split(' ')[0]}</div>
                                <div>{formatTime(`2000-01-01T${slot.hour.toString().padStart(2, '0')}:00:00`).split(' ')[1]}</div>
                            </div>
                        </div>
                    ))}
                    {/* Add the final 12:00 AM label for the end of the day */}
                    <div className="time-label" style={{ gridRow: 50 }}>
                        <div>
                            <div className="font-medium">12:00</div>
                            <div>AM</div>
                        </div>
                    </div>

                    {/* Render event cards last, so they are on top */}
                    {dayEvents.map(event => {
                        const gridColumn = categoryColumnMap.get(event.eventTypeId);
                        if (!gridColumn) return null;

                        const visualInfo = getEventVisualInfo(event);
                        const { startRow, endRow, span } = visualInfo;

                        // Get layout info for overlaps
                        const categoryLayout = layoutsByCategory.get(event.eventTypeId);
                        const layoutInfo = categoryLayout?.get(event.id) || { columnIndex: 0, totalColumns: 1 };

                        // Calculate width and position based on overlap
                        const widthPercent = 100 / layoutInfo.totalColumns;
                        const leftPercent = layoutInfo.columnIndex * widthPercent;
                        const isOverlapping = layoutInfo.totalColumns > 1;

                        // Get category color for this event
                        const categoryColor = getCategoryColor(event);
                        const titleColor = getPillColor(categoryColor, 0.5);

                        return (
                            <div
                                key={event.id}
                                style={{
                                    gridColumn: gridColumn,
                                    gridRow: `${startRow} / ${endRow}`,
                                    // Apply overlap positioning
                                    width: `${widthPercent}%`,
                                    marginLeft: `${leftPercent}%`,
                                    zIndex: 10 + layoutInfo.columnIndex, // Layer stacking for overlaps
                                    paddingRight: isOverlapping ? '2px' : '0' // Add slight gap
                                }}
                                className="h-full p-px relative"
                            >
                                <EventCard
                                    event={event}
                                    onClick={() => handleEventClick(event)}
                                    onHover={(e) => handleEventHover(event, e)}
                                    onLeave={handleEventLeave}
                                    viewType="day"
                                    visualInfo={visualInfo}
                                    isOverlapping={isOverlapping}
                                    showCareerImpact={true}
                                    style={{
                                        '--category-title-color': titleColor,
                                        '--text-on-pastel': titleColor,
                                        '--text-secondary-on-pastel': titleColor
                                    } as React.CSSProperties}
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