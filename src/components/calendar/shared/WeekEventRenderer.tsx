'use client';

import React from 'react';
import { Event, AgendaItem } from '@/types';
import { EventCard } from './EventCard';
import { getWeekEventVisualInfo } from '@/utils/eventViewUtils';
import { getPillColor } from '@/utils/pillColorUtils';
import { getCategoryColor } from '@/utils/eventUtils';

export interface WeekEventRendererProps {
    events: (Event & { agenda?: AgendaItem[] })[];
    dayIndex: number;
    currentDay: Date;
    startHour: number;
    endHour: number;
    onEventClick: (event: Event) => void;
    onEventHover: (event: Event, mouseEvent: React.MouseEvent) => void;
    onEventLeave: () => void;
    className?: string;
}

export const WeekEventRenderer: React.FC<WeekEventRendererProps> = ({
    events,
    dayIndex,
    currentDay,
    startHour,
    endHour,
    onEventClick,
    onEventHover,
    onEventLeave,
    className = ''
}) => {
    if (events.length === 0) {
        return null;
    }


    return (
        <>
            {events.map((event, eventIndex) => {
                const visualInfo = getWeekEventVisualInfo(event, startHour, endHour, currentDay);
                const { startRow, endRow } = visualInfo;

                // Skip events that don't have a valid position
                if (startRow >= endRow || startRow < 1) {
                    return null;
                }

                // Get category color for this event (same logic as month view)
                const categoryColor = getCategoryColor(event);
                const titleColor = getPillColor(categoryColor, 0.5);
                
                return (
                    <div
                        key={`${event.id}-${eventIndex}-${dayIndex}`}
                        className={`week-event-positioned ${className}`}
                        style={{
                            gridRow: `${startRow} / ${endRow}`,
                            zIndex: 10 + eventIndex
                        }}
                    >
                        <EventCard
                            event={event}
                            onClick={() => onEventClick(event)}
                            onHover={(e) => onEventHover(event, e)}
                            onLeave={onEventLeave}
                            viewType="week"
                            visualInfo={visualInfo}
                            showCareerImpact={true}
                            style={{
                                height: '100%',
                                margin: '1px 2px',
                                '--category-bg': categoryColor,
                                '--category-title-color': titleColor,
                                '--text-on-pastel': titleColor
                            } as React.CSSProperties}
                        />
                    </div>
                );
            })}
        </>
    );
};