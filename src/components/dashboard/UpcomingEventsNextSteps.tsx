'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import {
    Calendar,
    Clock,
    MapPin,
    ArrowRight
} from '@phosphor-icons/react';
import { format, differenceInDays } from 'date-fns';
import { useTrackedEventsUnified } from '@/hooks/useTrackedEventsUnified';
import { cn } from '@/lib/utils';
import type { TrackedEventRecord, Event, EventType } from '@/types';
import { DashboardSectionHeader } from '@/components/dashboard/DashboardSectionHeader';
import { DashboardCard } from '@/components/dashboard/DashboardCard';

interface UpcomingEventsNextStepsProps {
    trackedEvents: TrackedEventRecord[];
    upcomingEvents: Event[];
    eventTypes?: EventType[];
    className?: string;
}

const CONFIG = {
    maxVisibleEvents: 4,
    urgentThresholdDays: 7,
};

export function UpcomingEventsNextSteps({ trackedEvents, upcomingEvents, className = '' }: UpcomingEventsNextStepsProps) {
    // Filter tracked events that are in the future
    const data = useMemo(() => {
        const trackedIds = new Set(trackedEvents.map(t => t.eventId));

        return upcomingEvents
            .filter(event => trackedIds.has(event.id))
            .map(event => ({
                event,
                daysUntil: differenceInDays(new Date(event.startTime), new Date())
            }))
            .sort((a, b) => a.daysUntil - b.daysUntil)
            .slice(0, CONFIG.maxVisibleEvents);
    }, [trackedEvents, upcomingEvents]);

    const hasEvents = data.length > 0;
    const showPlaceholder = data.length === 1;

    return (
        <DashboardCard title="" className={cn("p-0 flex flex-col h-full bg-[#1C1C1E] border-none", className)}>
            <DashboardSectionHeader
                icon={Calendar}
                title="Upcoming Events"
                subtitle="Your schedule for the next 3 months"
                action={
                    <Link
                        href="/calendar"
                        className="flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                    >
                        View Calendar
                        <ArrowRight className="w-3 h-3" />
                    </Link>
                }
                className="px-5 pt-5 pb-2"
            />

            <div className="flex-1 flex flex-col px-2 pb-2">
                {hasEvents ? (
                    <div className="flex flex-col gap-1">
                        {data.map(({ event, daysUntil }) => {
                            const isUrgent = daysUntil <= CONFIG.urgentThresholdDays;

                            return (
                                <div
                                    key={event.id}
                                    className="group flex items-center gap-4 px-3 py-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                                    onClick={() => window.location.href = `/calendar?event=${event.id}`}
                                >
                                    {/* Left: Date Block */}
                                    <div className="flex items-center gap-3 w-[120px] shrink-0">
                                        <Calendar className="w-4 h-4 text-zinc-400" weight="duotone" />
                                        <span className="text-sm font-medium text-zinc-200">
                                            {format(new Date(event.startTime), 'MMM d')}
                                        </span>
                                    </div>

                                    {/* Middle: Title & Meta */}
                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                        <div className="flex items-center justify-between gap-4">
                                            <span className="text-sm font-medium text-white truncate">
                                                {event.title}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                                            <span>
                                                {format(new Date(event.startTime), 'h:mm a')}
                                            </span>
                                            {event.location && (
                                                <>
                                                    <span className="w-0.5 h-0.5 rounded-full bg-zinc-600" />
                                                    <span className="truncate max-w-[150px]">
                                                        {event.location}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right: Days Badge */}
                                    <div className={cn(
                                        "px-2 py-1 rounded-[4px] text-[11px] font-medium transition-colors",
                                        isUrgent
                                            ? "bg-orange-400/10 text-orange-400"
                                            : "bg-white/[0.08] text-zinc-400"
                                    )}>
                                        {daysUntil === 0 ? 'Today' : `${daysUntil}d`}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Placeholder Slot for Single Item */}
                        {showPlaceholder && (
                            <div className="flex items-center gap-4 px-3 py-3 rounded-lg border border-dashed border-white/10 opacity-40 select-none">
                                <div className="flex items-center gap-3 w-[120px] shrink-0">
                                    <Calendar className="w-4 h-4 text-zinc-500" />
                                    <span className="text-sm font-medium text-zinc-500">
                                        -- --
                                    </span>
                                </div>
                                <div className="flex-1">
                                    <span className="text-sm font-medium text-zinc-500">Open Slot</span>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center py-8 text-center opacity-60">
                        <Calendar className="w-8 h-8 text-zinc-600 mb-2" weight="thin" />
                        <p className="text-sm text-zinc-500">No upcoming events</p>
                    </div>
                )}
            </div>
        </DashboardCard>
    );
}
