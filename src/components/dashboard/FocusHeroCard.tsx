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
import { DashboardSectionHeader } from '@/components/dashboard/DashboardSectionHeader';
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
    const [isAttendanceDetailsOpen, setIsAttendanceDetailsOpen] = React.useState(false);

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
            {/* Header */}
            <DashboardSectionHeader title="Your Focus" />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                {/* Top Recommended Event - Main Card */}
                <div className="lg:col-span-2 flex">
                    {metrics.topRecommendedEvent ? (
                        <DashboardCard
                            title=""
                            className="w-full p-0 flex flex-col relative cursor-pointer hover:border-zinc-300 dark:hover:border-white/[0.12] group h-full"
                            onClick={() => handleEventClick(metrics.topRecommendedEvent!.event)}
                        >
                            <div className="relative z-10 flex flex-col h-full">
                                {/* Top Right Actions (Star) */}
                                <div className="absolute top-6 right-6 z-10">
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
                                        <Star className="w-5 h-5" weight={isBookmarked(metrics.topRecommendedEvent!.event.id) ? "fill" : "regular"} />
                                    </button>
                                </div>

                                {/* 1. Context Header & Badge */}
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="flex items-center gap-2 text-amber-500 dark:text-amber-400">
                                        <Sparkle className="w-4 h-4" weight="fill" />
                                        <span className="text-xs font-semibold tracking-wide uppercase">Recommended for You</span>
                                    </div>

                                    {/* High Impact Badge - Inline */}
                                    {(() => {
                                        const bucket = getImpactBucketLabel(metrics.topRecommendedEvent.score);
                                        if (bucket.label === 'High') {
                                            return (
                                                <div className="px-2 py-0.5 rounded-md border border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 text-[10px] font-medium tracking-wide">
                                                    High Impact
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>

                                {/* 2. Main Content */}
                                <div className="flex flex-col mb-4 flex-1">
                                    <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2 group-hover:text-amber-600 dark:group-hover:text-amber-50 transition-colors pr-12">
                                        {metrics.topRecommendedEvent.event.title}
                                    </h3>

                                    {/* Metadata Row */}
                                    <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-600 dark:text-glass-tertiary mb-4">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="w-4 h-4 text-zinc-400 dark:text-zinc-500" weight="regular" />
                                            <span>{format(new Date(metrics.topRecommendedEvent.event.startTime), 'MMM d, yyyy')}</span>
                                        </div>

                                        {metrics.topRecommendedEvent.event.location && (
                                            <>
                                                <span className="opacity-40">•</span>
                                                <div className="flex items-center gap-1.5">
                                                    <MapPin className="w-4 h-4 text-zinc-400 dark:text-zinc-500" weight="regular" />
                                                    <span className="truncate max-w-[200px]">{metrics.topRecommendedEvent.event.location}</span>
                                                </div>
                                            </>
                                        )}

                                        <span className="opacity-40">•</span>
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="w-4 h-4 text-zinc-400 dark:text-zinc-500" weight="regular" />
                                            {(() => {
                                                const daysUntil = Math.max(0, differenceInDays(new Date(metrics.topRecommendedEvent.event.startTime), new Date()));
                                                return (
                                                    <span className={`${daysUntil <= 3 ? "text-emerald-600 dark:text-emerald-500 font-medium" : ""}`}>
                                                        {daysUntil === 0 ? 'Happening Today' : `${daysUntil} days away`}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-3 max-w-none">
                                        {metrics.topRecommendedEvent.event.description || metrics.topRecommendedEvent.reason || "Join us for this high-impact event designed to boost your skills and network."}
                                    </p>
                                </div>

                                {/* 4. Footer Actions */}
                                <div className="pt-4 border-t border-zinc-100 dark:border-white/5 flex justify-between items-end mt-auto">
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

                                    <div className="flex items-center">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEventClick(metrics.topRecommendedEvent!.event);
                                            }}
                                            className="flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white transition-colors group/btn focus:outline-none py-1 h-5"
                                        >
                                            <span className="translate-y-[0.5px]">View Details</span>
                                            <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" weight="bold" />
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
                <DashboardCard title="" className="p-0 flex flex-col divide-y divide-zinc-100 dark:divide-white/[0.12] h-full">
                    {/* Row 1: Attendance Rate */}
                    {(() => {
                        // reliability = attended / (attended + missed)
                        // missed = attending status but event is in the past
                        const now = new Date();

                        // Valid event predicate to ensure event is not null
                        const hasEvent = (e: TrackedEventRecord): e is TrackedEventRecord & { event: Event } => !!e.event;

                        const attendedEvents = trackedEvents
                            .filter(e => e.status === 'attended')
                            .filter(hasEvent);

                        const missedEvents = trackedEvents
                            .filter(e =>
                                e.status === 'attending' &&
                                e.event?.startTime &&
                                new Date(e.event.startTime) < now
                            )
                            .filter(hasEvent);

                        const attendedCount = attendedEvents.length;
                        const missedCount = missedEvents.length;
                        const pastCommitments = attendedCount + missedCount;
                        const attendanceRate = pastCommitments > 0 ? Math.round((attendedCount / pastCommitments) * 100) : 0;

                        return (
                            <>
                                <button
                                    onClick={() => pastCommitments > 0 && setIsAttendanceDetailsOpen(true)}
                                    disabled={pastCommitments === 0}
                                    className={`p-4 w-full flex-1 flex flex-col items-start justify-center transition-all group text-left ${pastCommitments > 0 ? 'hover:bg-zinc-50 dark:hover:bg-white/[0.02] cursor-pointer' : ''}`}
                                >
                                    <div className="flex items-baseline gap-2 mb-1">
                                        <span className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight leading-none">
                                            {attendanceRate}%
                                        </span>
                                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Attendance Rate</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 min-h-[16px]">
                                        {pastCommitments > 0 ? (
                                            <span className="text-xs text-zinc-500 font-medium group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors">
                                                {attendedCount} of {pastCommitments} past events attended
                                            </span>
                                        ) : (
                                            <span className="text-xs text-zinc-400/80 dark:text-zinc-500/80">No past commitments</span>
                                        )}
                                    </div>
                                </button>

                                {/* Attendance Details Modal */}
                                {isAttendanceDetailsOpen && createPortal(
                                    <div
                                        className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in-0 duration-300"
                                        role="dialog"
                                        aria-modal="true"
                                    >
                                        <div
                                            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                                            onClick={() => setIsAttendanceDetailsOpen(false)}
                                        />
                                        <div
                                            className="relative glass-card w-full max-w-lg overflow-hidden flex flex-col bg-white dark:bg-black rounded-xl border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200"
                                            onClick={(e) => e.stopPropagation()}
                                            style={{ maxHeight: '80vh' }}
                                        >
                                            {/* Header */}
                                            <div className="p-5 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between bg-zinc-50/50 dark:bg-white/[0.02]">
                                                <div>
                                                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Attendance History</h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <div className="text-sm text-zinc-500">
                                                            <span className="font-medium text-zinc-900 dark:text-white">{attendanceRate}%</span> reliability score
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setIsAttendanceDetailsOpen(false)}
                                                    className="p-2 rounded-lg hover:bg-zinc-200/50 dark:hover:bg-white/10 transition-colors text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-white"
                                                >
                                                    <span className="text-xl leading-none">×</span>
                                                </button>
                                            </div>

                                            {/* Content */}
                                            <div className="overflow-y-auto p-5 space-y-6">
                                                {/* Missed Events (Priority) */}
                                                {missedCount > 0 && (
                                                    <div className="space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <h4 className="text-xs font-bold text-red-500 uppercase tracking-wider flex items-center gap-1.5">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                                                Missed ({missedCount})
                                                            </h4>
                                                            <span className="text-[10px] text-zinc-400">Past events not attended</span>
                                                        </div>
                                                        <div className="space-y-2">
                                                            {missedEvents.map(record => (
                                                                <div
                                                                    key={record.trackingId}
                                                                    className="flex items-start gap-3 p-3 rounded-lg bg-red-50/50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/10 group hover:border-red-200 dark:hover:border-red-500/20 transition-colors cursor-pointer"
                                                                    onClick={() => {
                                                                        setIsAttendanceDetailsOpen(false);
                                                                        handleEventClick(record.event);
                                                                    }}
                                                                >
                                                                    <div className="flex-1 min-w-0">
                                                                        <h5 className="text-sm font-medium text-zinc-900 dark:text-zinc-200 truncate pr-2 group-hover:text-red-900 dark:group-hover:text-red-100 transition-colors">
                                                                            {record.event.title}
                                                                        </h5>
                                                                        <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                                                                            <span>{format(new Date(record.event.startTime), 'MMM d, yyyy')}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="px-2 py-1 rounded text-[10px] font-medium bg-white dark:bg-black border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400">
                                                                        No show
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Attended Events */}
                                                {attendedCount > 0 && (
                                                    <div className="space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-1.5">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                                Attended ({attendedCount})
                                                            </h4>
                                                        </div>
                                                        <div className="space-y-2">
                                                            {attendedEvents.map(record => (
                                                                <div
                                                                    key={record.trackingId}
                                                                    className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 group hover:border-emerald-200 dark:hover:border-emerald-500/20 transition-colors cursor-pointer"
                                                                    onClick={() => {
                                                                        setIsAttendanceDetailsOpen(false);
                                                                        handleEventClick(record.event);
                                                                    }}
                                                                >
                                                                    <div className="flex-1 min-w-0">
                                                                        <h5 className="text-sm font-medium text-zinc-900 dark:text-zinc-200 truncate pr-2 group-hover:text-emerald-900 dark:group-hover:text-emerald-100 transition-colors">
                                                                            {record.event.title}
                                                                        </h5>
                                                                        <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                                                                            <span>{format(new Date(record.event.startTime), 'MMM d, yyyy')}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="px-2 py-1 rounded text-[10px] font-medium bg-white dark:bg-black border border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                                                                        Verified
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Footer */}
                                            <div className="p-4 border-t border-zinc-100 dark:border-white/5 bg-zinc-50/50 dark:bg-white/[0.02]">
                                                <p className="text-[10px] text-zinc-400 text-center">
                                                    Attendance rate helps prioritize your access to exclusive events.
                                                </p>
                                            </div>
                                        </div>
                                    </div>,
                                    document.body
                                )}
                            </>
                        );
                    })()}

                    {/* Row 2: Impact Score */}
                    <div className="p-4 w-full flex-1 flex flex-col items-start justify-center">
                        <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight leading-none">
                                {metrics.lastImpactScore && metrics.lastImpactScore.score > 0 ? Math.round(metrics.lastImpactScore.score) : '0'}
                            </span>
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Impact Score</span>
                        </div>
                        <div className="flex items-center gap-1.5 min-h-[16px]">
                            {metrics.lastImpactScore && metrics.lastImpactScore.score > 0 ? (
                                <span className={`text-xs font-medium ${metrics.lastImpactScore.score >= 80 ? 'text-emerald-600 dark:text-emerald-500' : 'text-zinc-500'}`}>
                                    {metrics.lastImpactScore.score >= 80 ? 'High Impact' : 'Keep going'}
                                </span>
                            ) : (
                                <span className="text-xs text-zinc-400/80 dark:text-zinc-500/80">Attend 1st event to unlock</span>
                            )}
                        </div>
                    </div>

                    {/* Row 3: Skills (Radial) */}
                    <div className="p-4 w-full flex-1 flex items-center gap-4">
                        <div className="relative w-10 h-10 flex-shrink-0 flex items-center justify-center">
                            {/* SVG Radial Progress */}
                            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 36 36">
                                {/* Track */}
                                <path
                                    className="text-zinc-100 dark:text-zinc-800"
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                />
                                {/* Progress */}
                                {careerProfile && careerProfile.skillsToLearn.length > 0 && (
                                    <path
                                        className="text-indigo-500 dark:text-indigo-400 transition-all duration-1000 ease-out"
                                        strokeDasharray={`${Math.min(Math.round((metrics.skillsCoveredThisMonth.uniqueSkills.length / careerProfile.skillsToLearn.length) * 100), 100)}, 100`}
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                    />
                                )}
                            </svg>
                        </div>

                        <div className="flex flex-col items-start justify-center h-10">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">Skills Progress</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xs text-zinc-900 dark:text-white font-medium">
                                    {metrics.skillsCoveredThisMonth.uniqueSkills.length} of {careerProfile?.skillsToLearn.length || 0}
                                </span>
                                <span className="text-xs text-zinc-500">developed</span>
                            </div>
                        </div>
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
                                    <Calendar className="w-12 h-12 text-zinc-300 dark:text-glass-tertiary opacity-60 mx-auto mb-3" weight="light" />
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
