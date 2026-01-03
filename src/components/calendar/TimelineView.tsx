'use client';

import { FC, useState } from 'react';
import { ClockIcon, CalendarIcon, CaretRightIcon } from '@phosphor-icons/react';
import { Event, AgendaItem } from '@/types';
import { useTimelineTheme } from '@/hooks/useTimelineTheme';
import { formatTimeRange as formatEventTimeRange } from '@/utils/dateUtils';
import { getEmptyState, eventsOverlap } from '@/utils/timelineUtils';
import { TimelineEventCard } from './TimelineEventCard';

interface TimelineViewProps {
    event: Event;
}

const TimelineView: FC<TimelineViewProps> = ({ event }) => {
    const theme = useTimelineTheme();
    // Get agenda from event
    const agenda = event.agenda || [];

    if (agenda.length === 0) {
        const emptyState = getEmptyState(theme.isDark);
        return (
            <div className="text-center py-8">
                <CalendarIcon className={`w-12 h-12 mx-auto mb-4 ${emptyState.iconClass}`} />
                <p className={`text-sm ${emptyState.textClass}`}>
                    {emptyState.message}
                </p>
            </div>
        );
    }
    const eventTimezone = event.timezone || 'UTC';

    // Helper function to convert time string to minutes
    const toMinutes = (timeString: string): number => {
        if (!timeString) return 0;
        if (timeString.includes('T') || timeString.includes(' ')) {
            const d = new Date(timeString);
            return d.getHours() * 60 + d.getMinutes();
        }
        const [h, m] = timeString.split(':');
        return parseInt(h || '0', 10) * 60 + parseInt(m || '0', 10);
    };

    // Group agenda items by day and create timeline clusters
    const groupedByDay = agenda.reduce((acc, item) => {
        const day = item.dayNumber || 1;
        if (!acc[day]) acc[day] = [];
        acc[day].push(item);
        return acc;
    }, {} as Record<number, AgendaItem[]>);

    // Create timeline clusters for each day (handling overlapping events)
    const timelineClusters = Object.entries(groupedByDay).reduce((acc, [day, dayItems]) => {
        // Sort items by start time
        const sortedItems = dayItems.sort((a, b) => {
            const timeA = toMinutes(a.startTime);
            const timeB = toMinutes(b.startTime);
            return timeA - timeB;
        });

        const clusters: Array<{
            timeSlot: string;
            startMinutes: number;
            endMinutes: number;
            items: AgendaItem[];
        }> = [];

        for (const item of sortedItems) {
            const itemStart = toMinutes(item.startTime);
            const itemEnd = toMinutes(item.endTime);

            // Find if this item overlaps with any existing cluster
            let addedToCluster = false;
            for (const cluster of clusters) {
                // Check if item overlaps with any item in this cluster
                const overlapsWithCluster = cluster.items.some(clusterItem =>
                    eventsOverlap(item, clusterItem)
                );

                if (overlapsWithCluster) {
                    cluster.items.push(item);
                    cluster.startMinutes = Math.min(cluster.startMinutes, itemStart);
                    cluster.endMinutes = Math.max(cluster.endMinutes, itemEnd);
                    addedToCluster = true;
                    break;
                }
            }

            if (!addedToCluster) {
                // Create new cluster
                clusters.push({
                    timeSlot: formatEventTimeRange(item.startTime, item.endTime, eventTimezone),
                    startMinutes: itemStart,
                    endMinutes: itemEnd,
                    items: [item]
                });
            }
        }

        acc[parseInt(day)] = clusters;
        return acc;
    }, {} as Record<number, Array<{
        timeSlot: string;
        startMinutes: number;
        endMinutes: number;
        items: AgendaItem[];
    }>>);

    // renderEventCard has been refactored into TimelineEventCard component

    // renderEventCard has been refactored into TimelineEventCard component

    return (
        <div className="relative pb-12">
            {/* Main Container with Continuous Spine */}
            <div className="ml-[100px] border-l-2 border-zinc-800 pl-6 relative min-h-[200px]">

                {Object.entries(timelineClusters)
                    .sort(([a], [b]) => parseInt(a) - parseInt(b))
                    .map(([day, clusters]) => {
                        return (
                            <div key={day} className="relative">
                                {/* Sticky Day Header - In the left margin */}
                                <div className={`sticky top-0 z-20 -ml-6 mb-8 pt-4 pb-2 backdrop-blur-md ${theme.isDark ? 'bg-[#121212]/80' : 'bg-white/80'}`}>
                                    <div className="absolute -left-[100px] top-4 w-[80px] text-right pr-2">
                                        <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                                            Day {day}
                                        </div>
                                    </div>
                                    {/* Optional: Add a visual separator or keep it clean */}
                                </div>

                                <div className="space-y-8">
                                    {clusters.map((cluster, clusterIndex) => {
                                        return (
                                            <div key={clusterIndex} className="relative">
                                                {/* Time Display - In the left margin */}
                                                <div className="absolute -left-[116px] top-0 w-[90px] text-right">
                                                    <span className="font-mono text-[11px] text-zinc-500 block">
                                                        {cluster.timeSlot.split(' - ')[0]}
                                                    </span>
                                                </div>

                                                {/* Timeline Node - Anchored to spine */}
                                                {/* Calculated: pl-6 (24px) + border (2px) = 26px to left edge. 
                                                    Dot is 10px. Center is 5px. 
                                                    To center on border (1px width effectively), we need center at -1px relative to content?
                                                    Let's try -left-[29px] (24px padding + 5px for half dot) */}
                                                <div className="absolute -left-[29px] top-[2px] w-2.5 h-2.5 rounded-full bg-[#18181B] border-2 border-zinc-600 z-10 box-content" />

                                                {/* Content Area */}
                                                <div>
                                                    {/* Parallel events layout */}
                                                    {cluster.items.length === 1 ? (
                                                        /* Single event */
                                                        <div className="relative group">
                                                            <TimelineEventCard
                                                                item={cluster.items[0]}
                                                                showIndividualTime={false}
                                                                eventTimezone={eventTimezone}
                                                            />
                                                        </div>
                                                    ) : (
                                                        /* Multiple parallel events - Stacked Effect */
                                                        <div className="relative">
                                                            {cluster.items.map((item, itemIndex) => (
                                                                <div
                                                                    key={item.id || itemIndex}
                                                                    className="relative mb-2 last:mb-0 transition-transform hover:-translate-y-1"
                                                                    style={{
                                                                        zIndex: cluster.items.length - itemIndex
                                                                    }}
                                                                >
                                                                    <TimelineEventCard
                                                                        item={item}
                                                                        showIndividualTime={false}
                                                                        eventTimezone={eventTimezone}
                                                                    />
                                                                </div>
                                                            ))}
                                                            <div className="mt-1 text-[10px] text-zinc-500 text-right">
                                                                {cluster.items.length} concurrent sessions
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
            </div>
        </div>
    );
};

export default TimelineView;
