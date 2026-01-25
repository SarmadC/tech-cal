'use client';

import React, { useMemo } from 'react';
import { Event, EventType, AppProfile, MultiDayEvent } from '@/types';
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

    // Dynamic Category Logic
    const dynamicColumns = useMemo(() => {
        // 1. Count events per category
        const categoryCounts = new Map<string, number>();
        categories.forEach(cat => {
            const count = dayEvents.filter(e => e.eventTypeId === cat.id).length;
            categoryCounts.set(cat.id, count);
        });

        // 2. Split categories
        const populatedCategories = categories.filter(cat => (categoryCounts.get(cat.id) || 0) > 0);
        const emptyCategories = categories.filter(cat => (categoryCounts.get(cat.id) || 0) === 0);

        // 3. Sort populated by count (descending)
        populatedCategories.sort((a, b) => (categoryCounts.get(b.id) || 0) - (categoryCounts.get(a.id) || 0));

        // 4. Logic: Limit to 5 columns total
        const MAX_COLUMNS = 5;

        if (populatedCategories.length > MAX_COLUMNS) {
            // Case A: Too many populated categories -> Group into "Other"
            const top4 = populatedCategories.slice(0, 4);
            // "Other" will contain rest of populated categories. 
            // We usually don't put empty categories into "Other" as they don't have events anyway.

            // Create synthetic "Other" category
            const otherCategory: EventType = {
                id: 'other-combined',
                name: 'Other',
                color: '#808080', // Grey
            } as EventType;

            return [...top4, otherCategory];
        } else {
            // Case B: Fits in 5 columns -> Fill with empty if needed
            const slotsNeeded = MAX_COLUMNS - populatedCategories.length;
            const filledEmpty = emptyCategories.slice(0, slotsNeeded);

            return [...populatedCategories, ...filledEmpty];
        }
    }, [dayEvents, categories]);

    // Map original category IDs to the displayed column index
    const categoryColumnMap = useMemo(() => {
        const map = new Map<string, number>();
        const MAX_COLUMNS = 5;

        // Helper to check if a category is in the top 4 (if we have overflow)
        // or just in the list (if no overflow)

        // Re-derive the "Other" grouping logic to build the map correctly
        // We need to know which categories go to "Other"

        // 1. Re-calculate counts and sort (same as above)
        const categoryCounts = new Map<string, number>();
        categories.forEach(cat => {
            const count = dayEvents.filter(e => e.eventTypeId === cat.id).length;
            categoryCounts.set(cat.id, count);
        });
        const populatedCategories = categories.filter(cat => (categoryCounts.get(cat.id) || 0) > 0);
        populatedCategories.sort((a, b) => (categoryCounts.get(b.id) || 0) - (categoryCounts.get(a.id) || 0));

        const hasOverflow = populatedCategories.length > MAX_COLUMNS;
        const top4Ids = hasOverflow ? new Set(populatedCategories.slice(0, 4).map(c => c.id)) : new Set(populatedCategories.map(c => c.id));

        // Column 1 is Time, so categories start at Column 2
        // If overflow:
        // Cols 2,3,4,5 are Top 4. Col 6 is Other.
        // Wait, Time is Col 1.
        // Dynamic Cols: [C1, C2, C3, C4, Other] -> Indices 0,1,2,3,4 in array -> Grid Cols 2,3,4,5,6

        dynamicColumns.forEach((col, index) => {
            if (col.id === 'other-combined') return; // Handled below
            map.set(col.id, index + 2);
        });

        if (hasOverflow) {
            const otherColIndex = 4 + 2; // 5th category column (index 4) + 2 offset = 6
            // Map all remaining populated categories to this column
            populatedCategories.forEach(cat => {
                if (!top4Ids.has(cat.id)) {
                    map.set(cat.id, otherColIndex);
                }
            });
        }

        return map;
    }, [categories, dayEvents, dynamicColumns]);

    // Calculate overlap layouts for each category column
    const layoutsByCategory = useMemo(() => {
        const layouts = new Map<string, Map<string, EventLayoutInfo>>();

        // Iterate over DYNAMIC columns to behave like independent vertical lanes
        dynamicColumns.forEach(category => {
            if (category.id === 'other-combined') {
                // Gather all events for "Other"
                // effectively all events whose ID maps to 'other-combined' column index?
                // No, we need to filter by the original categories that make up "Other".

                // Reverse engineering: find all events where categoryColumnMap.get(event.type) == otherColIndex(6)

                // Simpler: Just rely on the event filtering pass below
                // We need to calculate overlaps for the *combined* set of events in this column
                const otherColIndex = dynamicColumns.length + 1; // e.g. 5 cols -> index 6

                const combinedEvents = dayEvents.filter(e => {
                    const col = categoryColumnMap.get(e.eventTypeId);
                    return col === otherColIndex;
                });

                const layout = calculateOverlapLayout(combinedEvents);
                // We need to store this layout. But `layouts` map is keyed by category ID.
                // The render loop gets layout by `event.eventTypeId`.
                // So we must set this SAME layout object for ALL category IDs contained in "Other".
                combinedEvents.forEach(e => {
                    if (!layouts.has(e.eventTypeId)) {
                        layouts.set(e.eventTypeId, layout);
                    }
                });
                // Also set for 'other-combined' just in case
                layouts.set('other-combined', layout);
            } else {
                // Standard category
                const categoryEvents = dayEvents.filter(e => e.eventTypeId === category.id);
                const layout = calculateOverlapLayout(categoryEvents);
                layouts.set(category.id, layout);
            }
        });

        return layouts;
    }, [dayEvents, dynamicColumns, categoryColumnMap]);

    // Handlers
    const handleEventClick = (event: Event) => {
        onEventSelect?.(event);
    };
    const handleEventHover = (_event: Event, _mouseEvent: React.MouseEvent) => {};
    const handleEventLeave = () => {};

    const gridColsStyle = { gridTemplateColumns: `100px repeat(${Math.max(1, dynamicColumns.length)}, 1fr)` };

    return (
        <div className="flex h-full tech-day-view">
            <div className="flex-1 relative">
                <div className="category-header-container" style={gridColsStyle}>
                    <div className="category-header">Time</div>
                    {dynamicColumns.map(category => {
                        // Count events for this column
                        let eventCount = 0;
                        if (category.id === 'other-combined') {
                            // Count all events mapping to this column
                            const otherColIndex = dynamicColumns.length + 1;
                            eventCount = dayEvents.filter(e => categoryColumnMap.get(e.eventTypeId) === otherColIndex).length;
                        } else {
                            eventCount = dayEvents.filter(e => e.eventTypeId === category.id).length;
                        }

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
                        // CRITICAL: Use correct ID matching TimeSlotGrid logic (originalEventId if available)
                        const eventId = 'originalEventId' in event ? (event as any).originalEventId : (event as any).id;
                        const layoutInfo = categoryLayout?.get(eventId) || { columnIndex: 0, totalColumns: 1 };

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
                                        // Unified style handles colors internally
                                    } as React.CSSProperties}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>

        </div>
    );
}
