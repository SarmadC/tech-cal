'use client';

import { FC, useState, useMemo } from 'react';
import { CalendarIcon, CaretRightIcon, CaretDownIcon } from '@phosphor-icons/react';
import { Event, AgendaItem } from '@/types';
import { formatTimeRange as formatEventTimeRange } from '@/utils/dateUtils';
import { buildAgendaDayGroups, eventsOverlap, getAgendaItemIdentity, getAgendaItemSortValue } from '@/utils/timelineUtils';

import { TimelineEventCard } from './TimelineEventCard';
import { TimelineDetailPanel } from './TimelineDetailPanel';

interface TimelineViewProps {
    event: Event;
}

const EMPTY_AGENDA: AgendaItem[] = [];

const TimelineView: FC<TimelineViewProps> = ({ event }) => {
    // Get agenda from event
    const agenda = event.agenda ?? EMPTY_AGENDA;
    const eventTimezone = event.timezone || 'UTC';
    const agendaDayGroups = useMemo(
        () => buildAgendaDayGroups(agenda, eventTimezone),
        [agenda, eventTimezone]
    );

    const [selectedEvent, setSelectedEvent] = useState<AgendaItem | null>(() => {
        return agendaDayGroups[0]?.items[0] ?? null;
    });
    const [collapsedDays, setCollapsedDays] = useState<Set<string>>(() => new Set());

    const toggleDay = (dayKey: string) => {
        setCollapsedDays((previous) => {
            const next = new Set(previous);

            if (next.has(dayKey)) {
                next.delete(dayKey);
            } else {
                next.add(dayKey);
            }

            return next;
        });
    };

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

    const timelineClusters = useMemo(() => {
        return agendaDayGroups.map((group) => {
            const sortedItems = [...group.items].sort((a, b) => getAgendaItemSortValue(a) - getAgendaItemSortValue(b));

            const clusters: Array<{
                timeSlot: string;
                startMinutes: number;
                endMinutes: number;
                items: AgendaItem[];
            }> = [];

            sortedItems.forEach((item) => {
                const itemStart = toMinutes(item.startTime);
                const itemEnd = toMinutes(item.endTime);

                let addedToCluster = false;
                for (const cluster of clusters) {
                    const overlapsWithCluster = cluster.items.some((clusterItem) =>
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
                    clusters.push({
                        timeSlot: formatEventTimeRange(item.startTime, item.endTime, eventTimezone),
                        startMinutes: itemStart,
                        endMinutes: itemEnd,
                        items: [item]
                    });
                }
            });

            return {
                key: group.key,
                label: group.label,
                clusters,
            };
        });
    }, [agendaDayGroups, eventTimezone]);

    if (agenda.length === 0) {
        return (
            <div className="text-center py-8">
                <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-foreground-muted" />
                <p className="text-sm text-foreground-tertiary">No schedule available.</p>
            </div>
        );
    }

    const isSelectedAgendaItem = (item: AgendaItem) => {
        if (!selectedEvent) {
            return false;
        }

        return getAgendaItemIdentity(selectedEvent) === getAgendaItemIdentity(item);
    };

    // renderEventCard has been refactored into TimelineEventCard component

    return (
        <div className="relative pb-12 grid grid-cols-1 md:grid-cols-8 gap-x-6 md:h-[calc(100vh-220px)]">
            {/* Left Panel (Timeline List) */}
            <div className="md:col-span-3 overflow-y-auto md:pr-6 md:border-r border-border-subtle pt-6">
                {/* Main Container with Continuous Spine */}
                <div className="ml-6 pl-6 relative min-h-[200px]">
                    {/* Continuous Vertical Line */}
                    <div className="absolute left-[0px] top-4 bottom-0 w-[2px] bg-border-subtle z-0" />

                    {timelineClusters.map((dayGroup) => {
                            const isExpanded = !collapsedDays.has(dayGroup.key);

                            return (
                                <div key={dayGroup.key} className="relative mb-8 z-10">
                                    {/* Accordion Header - Anchored to spine */}
                                    <div
                                        className="relative -ml-[33px] mb-4 flex items-center cursor-pointer group"
                                        onClick={() => toggleDay(dayGroup.key)}
                                    >
                                        <div className="w-4 h-4 rounded-full border-2 border-border-default bg-background-main flex items-center justify-center transition-colors z-20 group-hover:border-border-strong">
                                            {isExpanded ? (
                                                <CaretDownIcon className="w-2.5 h-2.5 text-foreground-tertiary" />
                                            ) : (
                                                <CaretRightIcon className="w-2.5 h-2.5 text-foreground-tertiary" />
                                            )}
                                        </div>
                                        <div className="ml-4 text-xs font-bold uppercase tracking-wider text-foreground-tertiary group-hover:text-foreground-secondary">
                                            {dayGroup.label}
                                        </div>
                                    </div>

                                    {/* Content - Collapsible */}
                                    <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'block opacity-100' : 'hidden opacity-0'}`}>
                                        <div className="space-y-4">
                                            {dayGroup.clusters.map((cluster, clusterIndex) => {
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
                                                                        isSelected={isSelectedAgendaItem(cluster.items[0])}
                                                                        onClick={() => setSelectedEvent(cluster.items[0])}
                                                                    />
                                                                </div>
                                                            ) : (
                                                                /* Multiple parallel events - Stacked Effect */
                                                                <div className="relative">
                                                                    {cluster.items.map((item, itemIndex) => (
                                                                        <div
                                                                            key={getAgendaItemIdentity(item, itemIndex)}
                                                                            className="relative mb-2 last:mb-0 transition-transform hover:-translate-y-1"
                                                                            style={{
                                                                                zIndex: cluster.items.length - itemIndex
                                                                            }}
                                                                        >
                                                                            <TimelineEventCard
                                                                                item={item}
                                                                                showIndividualTime={true}
                                                                                eventTimezone={eventTimezone}
                                                                                isSelected={isSelectedAgendaItem(item)}
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
