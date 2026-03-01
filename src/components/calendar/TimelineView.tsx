'use client';

import { FC, useState } from 'react';
import { CalendarIcon, CaretRightIcon, CaretDownIcon } from '@phosphor-icons/react';
import { Event, AgendaItem } from '@/types';
import { formatTimeRange as formatEventTimeRange } from '@/utils/dateUtils';
import { eventsOverlap } from '@/utils/timelineUtils';

import { TimelineEventCard } from './TimelineEventCard';
import { TimelineDetailPanel } from './TimelineDetailPanel';

interface TimelineViewProps {
    event: Event;
}

const TimelineView: FC<TimelineViewProps> = ({ event }) => {
    // Get agenda from event
    const agenda = event.agenda || [];

    // State for expanded days (default closed)
    // Initialize state with lazy initializers to avoid render-cycle issues
    const [selectedEvent, setSelectedEvent] = useState<AgendaItem | null>(() => {
        if (!agenda.length) return null;
        // Find the first event (sorted by day and time)
        const sortedAgenda = [...agenda].sort((a, b) => {
            if ((a.dayNumber || 1) !== (b.dayNumber || 1)) {
                return (a.dayNumber || 1) - (b.dayNumber || 1);
            }
            return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        });
        return sortedAgenda.length > 0 ? sortedAgenda[0] : null;
    });

    const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>(() => {
        // Expand the first day by default
        if (!agenda.length) return {};
        const days = agenda.map(item => item.dayNumber || 1);
        const firstDay = Math.min(...days);
        return { [firstDay]: true };
    });

    const toggleDay = (day: number) => {
        setExpandedDays(prev => ({
            ...prev,
            [day]: !prev[day]
        }));
    };

    if (agenda.length === 0) {
        return (
            <div className="text-center py-8">
                <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-foreground-muted" />
                <p className="text-sm text-foreground-tertiary">No schedule available.</p>
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
        <div className="relative pb-12 grid grid-cols-1 md:grid-cols-8 gap-x-6 md:h-[calc(100vh-220px)]">
            {/* Left Panel (Timeline List) */}
            <div className="md:col-span-3 overflow-y-auto md:pr-6 md:border-r border-border-subtle pt-6">
                {/* Main Container with Continuous Spine */}
                <div className="ml-6 pl-6 relative min-h-[200px]">
                    {/* Continuous Vertical Line */}
                    <div className="absolute left-[0px] top-4 bottom-0 w-[2px] bg-border-subtle z-0" />

                    {Object.entries(timelineClusters)
                        .sort(([a], [b]) => parseInt(a) - parseInt(b))
                        .map(([dayStr, clusters]) => {
                            const day = parseInt(dayStr);
                            const isExpanded = expandedDays[day];

                            return (
                                <div key={day} className="relative mb-8 z-10">
                                    {/* Accordion Header - Anchored to spine */}
                                    <div
                                        className="relative -ml-[33px] mb-4 flex items-center cursor-pointer group"
                                        onClick={() => toggleDay(day)}
                                    >
                                        <div className="w-4 h-4 rounded-full border-2 border-border-default bg-background-main flex items-center justify-center transition-colors z-20 group-hover:border-border-strong">
                                            {isExpanded ? (
                                                <CaretDownIcon className="w-2.5 h-2.5 text-foreground-tertiary" />
                                            ) : (
                                                <CaretRightIcon className="w-2.5 h-2.5 text-foreground-tertiary" />
                                            )}
                                        </div>
                                        <div className="ml-4 text-xs font-bold uppercase tracking-wider text-foreground-tertiary group-hover:text-foreground-secondary">
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
                                                        <div
                                                            className="absolute -left-[32px] top-[18px] w-2.5 h-2.5 rounded-full border-2 border-border-default bg-background-main z-10 box-content"
                                                        />

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
                                                                    <div className="mt-1 text-[10px] text-right text-foreground-tertiary">
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

            {/* Right Panel (Detail View) */}
            <div className="md:col-span-5 md:pl-6 pt-6 mt-6 md:mt-0 border-t md:border-t-0 border-border-subtle md:h-full overflow-hidden relative">
                {selectedEvent ? (
                    <TimelineDetailPanel event={selectedEvent} eventTimezone={eventTimezone} />
                ) : (
                    <div className="h-full flex items-center justify-center text-foreground-tertiary">
                        Select an event to view details
                    </div>
                )}
            </div>
        </div>
    );
};

export default TimelineView;
