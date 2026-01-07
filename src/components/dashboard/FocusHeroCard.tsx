'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Clock, Target, Sparkle, Info, Star, ArrowRight, MapPin } from '@phosphor-icons/react';
import { format, differenceInDays } from 'date-fns';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { getImpactBucketLabel } from '@/config/recommendationThresholds';
import type { TrackedEventRecord, Event, CareerProfile, EventType } from '@/types';
import { useEventEngagement } from '@/hooks/useEventEngagement';
import { useSnackbar } from '@/contexts/SnackbarContext';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { DashboardCard } from '@/components/dashboard/DashboardCard';

// Dynamically import event detail panel
const EventDetailPanel = dynamic(
    () => import('@/components/calendar/EventDetailPanel'),
    { ssr: false }
);

interface FocusHeroCardProps {
    trackedEvents: TrackedEventRecord[];
    upcomingEvents: Event[];
    careerProfile: CareerProfile | null;
    eventTypes?: EventType[];
}

export function FocusHeroCard({
    trackedEvents,
    upcomingEvents,
    careerProfile,
    eventTypes = [],
}: FocusHeroCardProps) {
    const { toggleBookmark, isBookmarked } = useEventEngagement();
    const { showError } = useSnackbar();
    const [selectedEvent, setSelectedEvent] = React.useState<Event | null>(null);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [isUpcomingEventsModalOpen, setIsUpcomingEventsModalOpen] = React.useState(false);

    const metrics = useDashboardMetrics({
        trackedEvents,
        upcomingEvents,
        careerProfile,
    });

    const handleBookmark = async (event: Event) => {
        try {
            await toggleBookmark(event.id, event as unknown as Record<string, unknown>);
        } catch (error) {
            showError('Failed to bookmark event');
            console.error(error);
        }
    };

    const handleEventClick = (event: Event) => {
        setSelectedEvent(event);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setSelectedEvent(null);
    };

    // Handle escape key press and body scroll lock
    React.useEffect(() => {
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
    }, [isModalOpen]);

    return (
        <div className="mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Top Recommended Event - Main Card */}
                <div className="lg:col-span-2 flex">
                    {metrics.topRecommendedEvent ? (
                        <DashboardCard
                            title=""
                            className="w-full p-0 flex flex-col relative cursor-pointer hover:border-zinc-300 dark:hover:border-white/[0.12] group"
                            onClick={() => handleEventClick(metrics.topRecommendedEvent!.event)}
                        >
                            <div className="p-6 h-full flex flex-col">
                                {/* High Impact Badge - Absolute Top Right */}
                                {(() => {
                                    const bucket = getImpactBucketLabel(metrics.topRecommendedEvent.score);
                                    if (bucket.label === 'High') {
                                        return (
                                            <div className="absolute top-6 right-6 px-3 py-1 rounded-md border border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 text-xs font-medium tracking-wide z-10">
                                                High Impact
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}

                                {/* 1. Context Header */}
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="flex items-center gap-2 text-amber-500 dark:text-amber-400">
                                        <Sparkle className="w-4 h-4" weight="fill" />
                                        <span className="text-xs font-semibold tracking-wide uppercase">Recommended for You</span>
                                    </div>
                                </div>

                                {/* 2. Main Content & Data Sidebar (Ticket Layout) */}
                                <div className="flex flex-col lg:flex-row gap-6 mb-8 flex-1">
                                    {/* Left: Text Column */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-3 group-hover:text-amber-600 dark:group-hover:text-amber-50 transition-colors pr-8">
                                            {metrics.topRecommendedEvent.event.title}
                                        </h3>

                                        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-3">
                                            {metrics.topRecommendedEvent.event.description || metrics.topRecommendedEvent.reason || "Join us for this high-impact event designed to boost your skills and network."}
                                        </p>
                                    </div>

                                    {/* Right: Data Sidebar */}
                                    <div className="lg:w-56 flex-shrink-0 flex flex-col gap-4 border-l border-zinc-100 dark:border-white/5 pl-6 pt-1">
                                        {/* Date */}
                                        <div className="flex items-center gap-3">
                                            <Calendar className="w-4 h-4 text-zinc-400 dark:text-zinc-500" weight="regular" />
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                                                    {format(new Date(metrics.topRecommendedEvent.event.startTime), 'MMM d, yyyy')}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Location */}
                                        {metrics.topRecommendedEvent.event.location && (
                                            <div className="flex items-center gap-3">
                                                <MapPin className="w-4 h-4 text-zinc-400 dark:text-zinc-500" weight="regular" />
                                                <span className="text-sm text-zinc-600 dark:text-zinc-400 truncate max-w-[150px]" title={metrics.topRecommendedEvent.event.location}>
                                                    {metrics.topRecommendedEvent.event.location}
                                                </span>
                                            </div>
                                        )}

                                        {/* Time / Status */}
                                        <div className="flex items-center gap-3">
                                            <Clock className="w-4 h-4 text-zinc-400 dark:text-zinc-500" weight="regular" />
                                            {(() => {
                                                const daysUntil = Math.max(0, differenceInDays(new Date(metrics.topRecommendedEvent.event.startTime), new Date()));
                                                return (
                                                    <span className={`text-sm ${daysUntil <= 3 ? "text-emerald-600 dark:text-emerald-500 font-medium" : "text-zinc-500 dark:text-zinc-400"}`}>
                                                        {daysUntil === 0 ? 'Happening Today' : `${daysUntil} days away`}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>

                                {/* 4. Footer Actions */}
                                <div className="pt-4 border-t border-zinc-100 dark:border-white/5 flex justify-between items-center mt-auto">
                                    <div className="flex items-center gap-2">
                                        {/* Avatar/Logo Logic */}
                                        {metrics.topRecommendedEvent.event.organization?.logo ? (
                                            <div className="relative w-5 h-5 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                                                <Image
                                                    src={metrics.topRecommendedEvent.event.organization.logo}
                                                    alt={metrics.topRecommendedEvent.event.organizer || 'Organizer'}
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-5 h-5 rounded-full bg-indigo-500/10 flex items-center justify-center text-[10px] text-indigo-500">
                                                {metrics.topRecommendedEvent.event.organizer ? metrics.topRecommendedEvent.event.organizer.charAt(0).toUpperCase() : 'O'}
                                            </div>
                                        )}
                                        <span className="text-xs text-zinc-500">
                                            Hosted by <span className="text-zinc-700 dark:text-zinc-300 font-medium">{metrics.topRecommendedEvent.event.organizer || 'Organizer'}</span>
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleBookmark(metrics.topRecommendedEvent!.event);
                                            }}
                                            className={`transition-colors focus:outline-none p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-white/10 ${isBookmarked(metrics.topRecommendedEvent!.event.id)
                                                ? 'text-yellow-500 dark:text-yellow-400'
                                                : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                                                }`}
                                            title={isBookmarked(metrics.topRecommendedEvent!.event.id) ? "Remove Bookmark" : "Bookmark"}
                                        >
                                            <Star className="w-4 h-4" weight={isBookmarked(metrics.topRecommendedEvent!.event.id) ? "fill" : "regular"} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEventClick(metrics.topRecommendedEvent!.event);
                                            }}
                                            className="flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white transition-colors group/btn focus:outline-none py-1.5 pl-2"
                                        >
                                            View Details <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </DashboardCard>
                    ) : (
                        <DashboardCard title="" className="w-full">
                            <div className="text-center py-12 flex flex-col items-center justify-center w-full h-full">
                                <Target className="w-8 h-8 text-zinc-300 dark:text-zinc-800 mb-3" weight="light" />
                                <p className="text-sm font-medium text-zinc-500 mb-1">No recommendations</p>
                            </div>
                        </DashboardCard>
                    )}
                </div>

                {/* Quick Glance Metrics (Sidebar Widgets) */}
                <DashboardCard title="" className="p-0 flex flex-col divide-y divide-zinc-100 dark:divide-white/[0.08]">
                    {/* Upcoming Commitments */}
                    <button
                        onClick={() => metrics.upcomingCommitments > 0 && setIsUpcomingEventsModalOpen(true)}
                        disabled={metrics.upcomingCommitments === 0}
                        className={`p-6 w-full text-left transition-all ${metrics.upcomingCommitments > 0
                            ? 'hover:bg-zinc-50 dark:hover:bg-white/[0.02] cursor-pointer group'
                            : 'cursor-default'
                            }`}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold text-zinc-500 tracking-wide uppercase">
                                Upcoming
                            </span>
                            <Calendar className="w-4 h-4 text-zinc-400 dark:text-zinc-600" weight="regular" />
                        </div>
                        <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-2xl font-semibold text-zinc-900 dark:text-white">
                                {metrics.upcomingCommitments}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {metrics.upcomingCommitments === 1 ? 'Event' : 'Events'} attending
                            </p>
                            {metrics.upcomingCommitments > 0 && (
                                <span className="text-[10px] text-indigo-500 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 font-medium">
                                    View all <ArrowRight className="w-3 h-3" weight="bold" />
                                </span>
                            )}
                        </div>
                    </button>

                    {/* Last Impact Score */}
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold text-zinc-500 tracking-wide uppercase">
                                Last Impact
                            </span>
                            <Target className="w-4 h-4 text-zinc-400 dark:text-zinc-600" weight="regular" />
                        </div>
                        {metrics.lastImpactScore ? (
                            <>
                                <div className="flex items-baseline gap-2 mb-1">
                                    {metrics.lastImpactScore.score > 0 ? (
                                        <>
                                            <span className="text-2xl font-semibold text-zinc-900 dark:text-white">
                                                {Math.round(metrics.lastImpactScore.score)}
                                            </span>
                                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${metrics.lastImpactScore.score >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' :
                                                metrics.lastImpactScore.score >= 60 ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' :
                                                    'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                                                }`}>
                                                {metrics.lastImpactScore.score >= 80 ? 'High' :
                                                    metrics.lastImpactScore.score >= 60 ? 'Good' : 'Moderate'}
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-xl font-semibold text-zinc-400 dark:text-zinc-600">—</span>
                                    )}
                                </div>
                                <p className="text-xs text-zinc-500 truncate" title={metrics.lastImpactScore.eventTitle}>
                                    {metrics.lastImpactScore.score > 0
                                        ? metrics.lastImpactScore.eventTitle
                                        : 'Not yet scored'}
                                </p>
                            </>
                        ) : (
                            <div className="flex flex-col">
                                <span className="text-2xl font-semibold text-zinc-400 dark:text-zinc-700 mb-1">—</span>
                                <p className="text-xs text-zinc-400">Attend an event to see impact</p>
                            </div>
                        )}
                    </div>

                    {/* Skills Covered This Month */}
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold text-zinc-500 tracking-wide uppercase">
                                Skills
                            </span>
                            <Sparkle className="w-4 h-4 text-zinc-400 dark:text-zinc-600" weight="regular" />
                        </div>
                        <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-2xl font-semibold text-zinc-900 dark:text-white">
                                {metrics.skillsCoveredThisMonth.uniqueSkills.length}
                            </span>
                            {careerProfile && careerProfile.skillsToLearn.length > 0 && (
                                <span className="text-sm text-zinc-400 dark:text-zinc-500">
                                    / {careerProfile.skillsToLearn.length}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {metrics.skillsCoveredThisMonth.uniqueSkills.length > 0
                                ? 'Developed this month'
                                : careerProfile?.skillsToLearn.length
                                    ? 'Target skills to develop'
                                    : 'No skills tracked'}
                        </p>
                        {/* Skill gap indicator */}
                        {careerProfile && careerProfile.skillsToLearn.length > 0 && metrics.skillsCoveredThisMonth.uniqueSkills.length < careerProfile.skillsToLearn.length && (
                            <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-white/5">
                                <p className="text-[10px] text-zinc-500 dark:text-zinc-500">
                                    {careerProfile.skillsToLearn.length - metrics.skillsCoveredThisMonth.uniqueSkills.length} skill{careerProfile.skillsToLearn.length - metrics.skillsCoveredThisMonth.uniqueSkills.length > 1 ? 's' : ''} remaining
                                </p>
                            </div>
                        )}
                    </div>
                </DashboardCard>
            </div>

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
                        className="absolute inset-0 bg-black/70 dark:bg-black/70 light:bg-black/50 backdrop-blur-lg transition-opacity duration-300"
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

            {/* Upcoming Events Modal */}
            {isUpcomingEventsModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={() => setIsUpcomingEventsModalOpen(false)}
                >
                    <div
                        className="glass-card p-6 border border-white/10 dark:border-white/10 light:border-black/10 max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col bg-white dark:bg-black"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-xl font-semibold text-zinc-900 dark:text-glass-primary">Upcoming Events</h3>
                                <p className="text-sm text-zinc-500 dark:text-glass-tertiary mt-1">
                                    {metrics.followUpReminders.length} {metrics.followUpReminders.length === 1 ? 'event' : 'events'} you&apos;re attending
                                </p>
                            </div>
                            <button
                                onClick={() => setIsUpcomingEventsModalOpen(false)}
                                className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors text-zinc-500 dark:text-glass-tertiary"
                            >
                                <span className="text-2xl leading-none">×</span>
                            </button>
                        </div>

                        {/* Events List */}
                        <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-3">
                            {metrics.followUpReminders.length > 0 ? (
                                metrics.followUpReminders.map(({ event, daysUntil }) => (
                                    <div
                                        key={event.id}
                                        onClick={() => {
                                            setSelectedEvent(event);
                                            setIsUpcomingEventsModalOpen(false);
                                            setIsModalOpen(true);
                                        }}
                                        className="p-4 rounded-lg border border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20 hover:bg-zinc-50 dark:hover:bg-white/5 transition-all cursor-pointer"
                                    >
                                        <div className="flex items-start justify-between gap-4 mb-2">
                                            <h4 className="text-base font-medium text-zinc-900 dark:text-glass-primary line-clamp-2 flex-1">
                                                {event.title}
                                            </h4>
                                            <div className="flex-shrink-0 text-xs font-medium text-zinc-500 dark:text-glass-tertiary">
                                                {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil}d`}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-zinc-600 dark:text-glass-tertiary">
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5" weight="regular" />
                                                <span>{format(new Date(event.startTime), 'MMM d, yyyy')}</span>
                                                <span className="opacity-60">•</span>
                                                <span>{format(new Date(event.startTime), 'h:mm a')}</span>
                                            </div>
                                            {event.location && (
                                                <>
                                                    <span className="opacity-60">•</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <Calendar className="w-3.5 h-3.5" weight="regular" />
                                                        <span className="line-clamp-1">{event.location}</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12">
                                    <Calendar className="w-12 h-12 text-zinc-300 dark:text-glass-tertiary opacity-60 mx-auto mb-3" weight="regular" />
                                    <p className="text-sm font-medium text-zinc-900 dark:text-glass-secondary mb-1">No upcoming events</p>
                                    <p className="text-xs text-zinc-500 dark:text-glass-tertiary">Events you&apos;re attending will appear here</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
