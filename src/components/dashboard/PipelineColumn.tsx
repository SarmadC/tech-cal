'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Clock, Star, CalendarBlank, ArrowRight, Lightning } from '@phosphor-icons/react';
import { format, differenceInDays } from 'date-fns';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import type { TrackedEventRecord, Event, CareerProfile, EventType } from '@/types';
import dynamic from 'next/dynamic';

// Dynamically import event detail panel
const EventDetailPanel = dynamic(
    () => import('@/components/calendar/EventDetailPanel'),
    { ssr: false }
);

interface PipelineColumnProps {
    trackedEvents: TrackedEventRecord[];
    upcomingEvents: Event[];
    careerProfile: CareerProfile | null;
    eventTypes?: EventType[];
}

// Get impact score from event
function getEventImpactScore(event: Event): number {
    const asScored = event as {
        careerImpactLite?: { overall: number };
        careerImpact?: { overall: number };
    };
    return asScored.careerImpactLite?.overall ?? asScored.careerImpact?.overall ?? 50;
}

// Calculate smart score (impact × urgency factor)
function calculateSmartScore(event: Event, daysUntil: number): number {
    const impact = getEventImpactScore(event);
    // Urgency factor: higher for events happening soon (0 days = 2x, 7+ days = 1x)
    const urgencyFactor = Math.max(1, 2 - (daysUntil / 7));
    return impact * urgencyFactor;
}

export function PipelineColumn({
    trackedEvents,
    upcomingEvents,
    careerProfile,
    eventTypes = [],
}: PipelineColumnProps) {
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const metrics = useDashboardMetrics({
        trackedEvents,
        upcomingEvents,
        careerProfile,
    });

    // Smart sorted reminders (impact × urgency)
    const sortedReminders = useMemo(() => {
        return [...metrics.followUpReminders]
            .map(item => ({
                ...item,
                smartScore: calculateSmartScore(item.event, item.daysUntil),
                impactScore: getEventImpactScore(item.event),
            }))
            .sort((a, b) => b.smartScore - a.smartScore);
    }, [metrics.followUpReminders]);

    // Get top 2 high-impact event IDs for "Don't Miss" badge
    const dontMissEventIds = useMemo(() => {
        return sortedReminders
            .filter(r => r.impactScore >= 70)
            .slice(0, 2)
            .map(r => r.event.id);
    }, [sortedReminders]);

    const handleEventClick = useCallback((event: Event) => {
        setSelectedEvent(event);
        setIsModalOpen(true);
    }, []);

    const handleModalClose = useCallback(() => {
        setIsModalOpen(false);
        setSelectedEvent(null);
    }, []);

    // Handle escape key press and body scroll lock
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isModalOpen) {
                handleModalClose();
            }
        };

        if (isModalOpen) {
            document.body.style.overflow = 'hidden';
            document.addEventListener('keydown', handleEscape);
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isModalOpen, handleModalClose]);

    // Check if there are many events (capacity indicator)
    const hasHighCapacity = sortedReminders.length >= 5;

    return (
        <div className="space-y-6">
            {/* Follow-up Reminders */}
            <DashboardCard title="" className="p-5">
                {/* Capacity warning */}
                {hasHighCapacity && (
                    <div className="flex items-center gap-2 mb-4 p-2 rounded bg-amber-500/10 border border-amber-500/20">
                        <CalendarBlank className="w-3.5 h-3.5 text-amber-400" weight="fill" />
                        <span className="text-[10px] text-amber-400">
                            Busy schedule ahead - {sortedReminders.length} events coming up
                        </span>
                    </div>
                )}

                {sortedReminders.length > 0 ? (
                    <div className="space-y-3">
                        {sortedReminders.slice(0, 5).map(({ event, daysUntil, impactScore }) => {
                            const isDontMiss = dontMissEventIds.includes(event.id);

                            return (
                                <div
                                    key={event.id}
                                    className={`p-3 rounded-md border transition-all group cursor-pointer ${isDontMiss
                                        ? 'border-indigo-500/30 bg-indigo-500/5 hover:border-indigo-500/50'
                                        : 'border-zinc-200 dark:border-white/5 hover:border-zinc-300 dark:hover:border-white/10 bg-zinc-50 dark:bg-zinc-900/30'
                                        }`}
                                    onClick={() => handleEventClick(event)}
                                >
                                    {/* Don't Miss badge */}
                                    {isDontMiss && (
                                        <div className="flex items-center gap-1 mb-2">
                                            <Star className="w-3 h-3 text-indigo-400" weight="fill" />
                                            <span className="text-[10px] font-medium text-indigo-500 dark:text-indigo-400 tracking-wide">
                                                Don&apos;t Miss
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-200 line-clamp-2 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                                            {event.title}
                                        </h4>
                                        <div className={`flex-shrink-0 text-xs font-medium px-1.5 py-0.5 rounded ${daysUntil === 0 ? 'bg-red-500/20 text-red-400' :
                                            daysUntil === 1 ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' :
                                                daysUntil <= 3 ? 'bg-zinc-200 dark:bg-zinc-700/50 text-zinc-600 dark:text-zinc-300' :
                                                    'text-zinc-500'
                                            }`}>
                                            {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil}d`}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                                            <Clock className="w-3.5 h-3.5" weight="regular" />
                                            <span>{format(new Date(event.startTime), 'MMM d, h:mm a')}</span>
                                        </div>
                                        {impactScore >= 70 && (
                                            <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                                                <Lightning className="w-3 h-3" weight="fill" />
                                                <span>High Impact</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-center py-6">
                        <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800/50 flex items-center justify-center mb-3">
                            <CalendarBlank className="w-5 h-5 text-zinc-400 dark:text-zinc-600" weight="light" />
                        </div>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">No upcoming events</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-600 mb-3">RSVP to events to see them here</p>
                        <Link
                            href="/discover"
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                        >
                            Browse Events
                            <ArrowRight className="w-3.5 h-3.5" weight="bold" />
                        </Link>
                    </div>
                )}
            </DashboardCard>

            {/* Event Detail Modal */}
            {isModalOpen && selectedEvent && createPortal(
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in-0 duration-300"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-title"
                >
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-lg transition-opacity duration-300"
                        onClick={handleModalClose}
                        aria-hidden="true"
                    />

                    {/* Modal Content */}
                    <div className="relative w-full max-w-2xl max-h-[90vh] animate-in zoom-in-95 fade-in-0 duration-300 ease-out drop-shadow-2xl">
                        <EventDetailPanel
                            event={selectedEvent}
                            onClose={handleModalClose}
                            categories={eventTypes}
                            variant="modal"
                        />
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
