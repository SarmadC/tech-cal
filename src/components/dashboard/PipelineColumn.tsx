'use client';

import React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
    Calendar,
    ArrowRight,
    Plus
} from '@phosphor-icons/react';
import { format } from 'date-fns';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { DashboardSectionHeader } from '@/components/dashboard/DashboardSectionHeader';
import { cn } from '@/lib/utils';
import type { TrackedEventRecord, Event, CareerProfile, EventType } from '@/types';

const EventDetailSidebar = dynamic(
    () => import('@/components/calendar/EventDetailSidebar'),
    { ssr: false }
);

interface PipelineColumnProps {
    trackedEvents: TrackedEventRecord[];
    upcomingEvents: Event[];
    careerProfile: CareerProfile | null;
    eventTypes?: EventType[];
}

export function PipelineColumn({
    trackedEvents,
    upcomingEvents,
    careerProfile,
    eventTypes = [],
}: PipelineColumnProps) {
    const [selectedEvent, setSelectedEvent] = React.useState<Event | null>(null);

    const metrics = useDashboardMetrics({
        trackedEvents,
        upcomingEvents,
        careerProfile,
    });

    const displayEvents = metrics.followUpReminders.slice(0, 4);
    const showPlaceholder = displayEvents.length === 1;

    return (
        <DashboardCard title="" className="w-full flex flex-col">
            <DashboardSectionHeader
                icon={Calendar}
                title="Upcoming Events"
                subtitle="Your schedule for the next 3 months"
                action={
                    <Link
                        href="/calendar"
                        className="flex items-center gap-1 text-xs font-medium text-indigo-500 hover:text-indigo-400 transition-colors"
                    >
                        View Calendar
                        <ArrowRight className="w-3 h-3" />
                    </Link>
                }
                className="px-5 pt-5 pb-2"
            />

            <div className="flex flex-col px-2 pb-2 gap-1">
                {displayEvents.length > 0 ? (
                    <>
                        {displayEvents.map(({ event, daysUntil }) => {
                            const isUrgent = daysUntil <= 7;
                            const isFar = daysUntil > 30;

                            return (
                                <button
                                    key={event.id}
                                    type="button"
                                    onClick={() => setSelectedEvent(event)}
                                    className="group flex items-start gap-4 px-3 py-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                                >
                                    {/* Left Column: Date Block */}
                                    <div className="flex flex-col w-[80px] shrink-0">
                                        <span className="text-sm font-medium text-zinc-900 dark:text-white leading-tight">
                                            {format(new Date(event.startTime), 'MMM d')}
                                        </span>
                                        <span className="text-xs text-zinc-500 mt-0.5">
                                            {format(new Date(event.startTime), 'h:mm a')}
                                        </span>
                                    </div>

                                    {/* Middle Column: Title & Location */}
                                    <div className="flex-1 min-w-0 flex flex-col">
                                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-200 truncate group-hover:text-indigo-400 transition-colors">
                                            {event.title}
                                        </span>
                                        {event.location && (
                                            <span className="text-xs text-zinc-500 truncate mt-0.5">
                                                {event.location}
                                            </span>
                                        )}
                                    </div>

                                    {/* Right Column: Countdown Badge */}
                                    <div className="shrink-0">
                                        <div className={cn(
                                            "min-w-[40px] text-center px-2 py-1 rounded-md text-[10px] font-medium tracking-wide transition-colors",
                                            isUrgent
                                                ? "bg-orange-500/10 text-orange-500"
                                                : isFar
                                                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                                                    : "bg-indigo-500/10 text-indigo-400"
                                        )}>
                                            {daysUntil === 0 ? 'Today' : `${daysUntil}d`}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}

                        {/* Placeholder Slot */}
                        {showPlaceholder && (
                            <div className="flex items-center justify-center px-3 py-4 rounded-lg border border-dashed border-zinc-200 dark:border-white/10 opacity-40 select-none mx-3 mb-2">
                                <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-600">
                                    <Plus className="w-3.5 h-3.5" />
                                    <span className="text-sm font-medium">Open Slot</span>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center py-8 text-center opacity-60">
                        <Calendar className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mb-2" weight="thin" />
                        <p className="text-sm text-zinc-500 dark:text-zinc-500">No upcoming events</p>
                    </div>
                )}
            </div>

            <EventDetailSidebar
                event={selectedEvent}
                onClose={() => setSelectedEvent(null)}
                categories={eventTypes}
            />
        </DashboardCard>
    );
}
