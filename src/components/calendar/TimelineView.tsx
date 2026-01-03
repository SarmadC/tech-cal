'use client';

import { FC, useState } from 'react';
import { ClockIcon, CalendarIcon, CaretRightIcon, CaretDownIcon } from '@phosphor-icons/react';
import { Event, AgendaItem } from '@/types';
import { useTimelineTheme } from '@/hooks/useTimelineTheme';
import { formatTimeRange as formatEventTimeRange } from '@/utils/dateUtils';
import { getEmptyState, eventsOverlap } from '@/utils/timelineUtils';

import { TimelineEventCard } from './TimelineEventCard';
import { TimelineDetailPanel } from './TimelineDetailPanel';

interface TimelineViewProps {
    event: Event;
}

const TimelineView: FC<TimelineViewProps> = ({ event }) => {
    const theme = useTimelineTheme();
    // Get agenda from event
    const agenda = event.agenda || [];

    // State for expanded days (default closed)
    const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>({});

    // State for selected event (Master-Detail view)
    const [selectedEvent, setSelectedEvent] = useState<AgendaItem | null>(null);

    // Initialize selected event with the first event of the first day
    if (!selectedEvent && agenda.length > 0) {
        // Find the first event (sorted by day and time)
        const sortedAgenda = [...agenda].sort((a, b) => {
            if ((a.dayNumber || 1) !== (b.dayNumber || 1)) {
                return (a.dayNumber || 1) - (b.dayNumber || 1);
            }
            return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        });
        if (sortedAgenda.length > 0) {
            setSelectedEvent(sortedAgenda[0]);
        }
    }

    const toggleDay = (day: number) => {
        setExpandedDays(prev => ({
            ...prev,
            [day]: !prev[day]
        }));
    };

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

    return (
        <div className="relative pb-12 flex h-[calc(100vh-200px)]">
            {/* Left Panel (Timeline List) - 40% Width */}
            <div className="w-[40%] overflow-y-auto pr-4 border-r border-zinc-800">
                {/* Main Container with Continuous Spine */}
                <div className="ml-6 border-l-2 border-zinc-800 pl-6 relative min-h-[200px]">

                    {Object.entries(timelineClusters)
                        .sort(([a], [b]) => parseInt(a) - parseInt(b))
                        .map(([dayStr, clusters]) => {
                            const day = parseInt(dayStr);
                            const isExpanded = expandedDays[day];

                            return (
                                <div key={day} className="relative mb-8">
                                    {/* Accordion Header - Anchored to spine */}
                                    <div
                                        className="relative -ml-[33px] mb-4 flex items-center cursor-pointer group"
                                        onClick={() => toggleDay(day)}
                                    >
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors z-20 ${theme.isDark
                                            ? 'bg-[#18181B] border-zinc-600 group-hover:border-zinc-400'
                                            : 'bg-white border-gray-300 group-hover:border-gray-400'
                                            }`}>
                                            {isExpanded ? (
                                                <CaretDownIcon className={`w-2.5 h-2.5 ${theme.isDark ? 'text-zinc-400' : 'text-gray-500'}`} />
                                            ) : (
                                                <CaretRightIcon className={`w-2.5 h-2.5 ${theme.isDark ? 'text-zinc-400' : 'text-gray-500'}`} />
                                            )}
                                        </div>
                                        <div className={`ml-4 text-xs font-bold uppercase tracking-wider ${theme.isDark ? 'text-zinc-400 group-hover:text-zinc-300' : 'text-gray-600 group-hover:text-gray-800'}`}>
                                            Day {day}
                                        </div>
                                    </div>

                                    {/* Content - Collapsible */}
                                    <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'block opacity-100' : 'hidden opacity-0'}`}>
                                        <div className="space-y-4">
                                            {clusters.map((cluster, clusterIndex) => {
                                                return (
                                                    <div key={clusterIndex} className="relative">
                                                        {/* Timeline Node - Anchored to spine */}
                                                        <div className="absolute -left-[32px] top-[18px] w-2.5 h-2.5 rounded-full bg-[#18181B] border-2 border-zinc-600 z-10 box-content" />

                                                        {/* Content Area */}
                                                        <div>
                                                            {/* Parallel events layout */}
                                                            {cluster.items.length === 1 ? (
                                                                /* Single event */
                                                                <div className="relative group">
                                                                    <TimelineEventCard
                                                                        item={cluster.items[0]}
                                                                        showIndividualTime={true}
                                                                        eventTimezone={eventTimezone}
                                                                        isSelected={selectedEvent?.id === cluster.items[0].id}
                                                                        onClick={() => setSelectedEvent(cluster.items[0])}
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
                                                                                showIndividualTime={true}
                                                                                eventTimezone={eventTimezone}
                                                                                isSelected={selectedEvent?.id === item.id}
                                                                                onClick={() => setSelectedEvent(item)}
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
                                </div>
                            );
                        })}
                </div>
            </div>

            {/* Right Panel (Detail View) - 60% Width */}
            <div className="w-[60%] pl-6 border-l border-zinc-800/50">
                {selectedEvent ? (
                    <TimelineDetailPanel event={selectedEvent} eventTimezone={eventTimezone} />
                ) : (
                    <div className="h-full flex items-center justify-center text-zinc-500">
                        Select an event to view details
                    </div>
                )}
            </div>
        </div>
    );
};

export default TimelineView;
