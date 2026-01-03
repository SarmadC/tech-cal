import React, { useState } from 'react';
import { Event, MultiDayEventInstance } from '@/types';
import { EventCard } from './EventCard';
import { getCategoryColor } from '@/utils/eventUtils';

interface StackedEventClusterProps {
    events: (Event | MultiDayEventInstance)[];
    onEventClick: (event: Event | MultiDayEventInstance) => void;
    onEventHover: (event: Event | MultiDayEventInstance, mouseEvent: React.MouseEvent) => void;
    onEventLeave: () => void;
    gridColumn: number;
    startRow: number;
    endRow: number;
}

export const StackedEventCluster: React.FC<StackedEventClusterProps> = ({
    events,
    onEventClick,
    onEventHover,
    onEventLeave,
    gridColumn,
    startRow,
    endRow,
}) => {
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    // Sort events: Duration (longest first), then Start Time, then Title
    const sortedEvents = [...events].sort((a, b) => {
        const startA = new Date(a.startTime).getTime();
        const endA = a.endTime ? new Date(a.endTime).getTime() : startA + 3600000;
        const durationA = endA - startA;

        const startB = new Date(b.startTime).getTime();
        const endB = b.endTime ? new Date(b.endTime).getTime() : startB + 3600000;
        const durationB = endB - startB;

        if (durationA !== durationB) {
            return durationB - durationA; // Longest first
        }
        if (startA !== startB) {
            return startA - startB;
        }
        return (a.title || '').localeCompare(b.title || '');
    });

    return (
        <div
            className="week-event-flex-stack"
            style={{
                gridColumn,
                gridRow: `${startRow} / ${endRow}`,
                // Flex container styles handled by CSS class .week-event-flex-stack
                gap: '1px',
            }}
        >
            {sortedEvents.map((event) => {
                const eventId = 'originalEventId' in event ? event.originalEventId : event.id;
                const isHovered = hoveredId === eventId;

                // Determine if any card is currently hovered in this stack
                const isAnyHovered = hoveredId !== null;

                // Layout logic: Default = Longest expanded. Hover = Hovered expanded.
                const isDefaultExpanded = !isAnyHovered && sortedEvents.indexOf(event) === 0;
                const isExpanded = isHovered || isDefaultExpanded;

                const categoryColor = getCategoryColor(event);

                return (
                    <div
                        key={`${eventId}-${startRow}`}
                        className={`week-event-flex-item ${isExpanded ? 'expanded' : 'collapsed'}`}
                        style={{
                            flexGrow: isExpanded ? 1 : 0,
                            flexShrink: isExpanded ? 0 : 1,
                            height: isExpanded ? 'auto' : '36px',
                            minHeight: '36px',
                            // Transition handled by CSS
                        }}
                        onMouseEnter={(e) => {
                            setHoveredId(eventId);
                            onEventHover(event, e);
                        }}
                        onMouseLeave={() => {
                            setHoveredId(null);
                            onEventLeave();
                        }}
                    >
                        <EventCard
                            event={event}
                            onClick={() => onEventClick(event)}
                            onHover={() => { }} // Handled by wrapper
                            onLeave={() => { }} // Handled by wrapper
                            viewType="week"
                            isSummary={!isExpanded}
                            visualInfo={{ span: endRow - startRow }}
                            style={{
                                height: '100%',
                                width: '100%',
                                backgroundColor: categoryColor, // Force solid category color
                            }}
                        />
                    </div>
                );
            })}
        </div>
    );
};
