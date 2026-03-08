'use client';

import { FC, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { XIcon, ArrowSquareOutIcon, Bookmark } from '@phosphor-icons/react';
import '@/app/styles/event-card.css';

// 1. UPDATE IMPORTS: Use the new, specific type names.
import { Event, EventType, AgendaItem, MultiDayEventInstance } from '@/types';
import { EventService } from '@/services/eventServices';
import { createClient } from '@/utils/supabase/client';
import EventInfo from './EventInfo';
import EventTracking from './EventTracking';
import AdaptiveTimeline from './AdaptiveTimeline';
import { getSpeakerAvatarUrls } from '@/utils/timelineUtils';
import TrackAgendaView, { groupAgendaByTrack } from './TrackAgendaView';
import { EventFeedbackForm } from '@/components/events/EventFeedbackForm';
import { useEventEngagement } from '@/hooks/useEventEngagement';
import { useAuth } from '@/contexts';
import { generateEventSlug } from '@/utils/slugUtils';
import { useSnackbar } from '@/contexts/SnackbarContext';

// 2. UPDATE PROPS: The interface now uses the new types.
interface EventDetailPanelProps {
    event: Event;
    onClose: () => void;
    categories: EventType[];
    variant?: 'sidebar' | 'modal';
}

const EventDetailPanel: FC<EventDetailPanelProps> = ({ event, onClose, categories, variant = 'sidebar' }) => {
    const category = categories.find(c => c.id === event.eventTypeId);
    const [eventWithAgenda, setEventWithAgenda] = useState<Event & { agenda?: AgendaItem[] }>(event);
    const [isLoading, setIsLoading] = useState(true);
    const [agendaView, setAgendaView] = useState<'timeline' | 'tracks'>('timeline');
    const { showError } = useSnackbar();

    // Add bookmark functionality
    const { user } = useAuth();
    const { isBookmarked, toggleBookmark, getAttendanceStatus, isLoading: isBookmarkLoading } = useEventEngagement();

    // Get the display event (with agenda if available)
    const displayEvent = eventWithAgenda;
    const trackGroups = useMemo(() => groupAgendaByTrack(displayEvent.agenda || []), [displayEvent.agenda]);
    const hasTrackAgenda = trackGroups.length > 0;

    // Update eventWithAgenda when event prop changes
    useEffect(() => {
        setEventWithAgenda(event);
        setIsLoading(true);
        setAgendaView('timeline');
    }, [event]); // Update when event prop changes

    useEffect(() => {
        if (!hasTrackAgenda && agendaView === 'tracks') {
            setAgendaView('timeline');
        }
    }, [hasTrackAgenda, agendaView]);


    // Debug: Log the agendaUrl to see if it's populated
    console.log('EventDetailPanel - displayEvent.agendaUrl:', displayEvent.agendaUrl);

    // Check if event is bookmarked
    const eventIsBookmarked = isBookmarked(displayEvent.id);

    // Handle bookmark/unbookmark event
    const handleBookmarkEvent = async () => {
        if (!user) {
            return;
        }

        try {
            await toggleBookmark(displayEvent.id, displayEvent as unknown as Record<string, unknown>);
        } catch (error) {
            const isLimit = error instanceof Error && error.message === 'BOOKMARK_LIMIT_REACHED';
            showError(isLimit ? 'Bookmark limit reached. Upgrade to add more.' : 'Failed to update bookmark');
        }
    };

    // Fetch complete event details with agenda
    useEffect(() => {
        let isMounted = true;
        let timeoutId: NodeJS.Timeout;
        let transitionTimeoutId: NodeJS.Timeout;

        const fetchEventWithAgenda = async () => {
            // If event already has agenda, no need to fetch
            if (event.agenda && event.agenda.length > 0) {
                console.log('[EventDetailPanel] Event already has agenda, skipping fetch');
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);

                // Set a timeout to ensure loading state doesn't get stuck
                timeoutId = setTimeout(() => {
                    if (isMounted) {
                        console.warn('[EventDetailPanel] Agenda fetch timeout, using basic event data');
                        setIsLoading(false);
                    }
                }, 10000); // 10 second timeout

                const supabase = createClient();

                // Use originalEventId for multi-day instances, otherwise the regular id
                const fetchEventId = ('originalEventId' in event ? (event as MultiDayEventInstance).originalEventId : null) || event.id;

                console.log('[EventDetailPanel] Fetching agenda for event:', fetchEventId);
                const fullEvent = await EventService.getEventWithAgenda(fetchEventId, supabase);

                // Clear the timeout since we got a response
                clearTimeout(timeoutId);

                if (isMounted) {
                    console.log('[EventDetailPanel] Agenda fetched successfully:', fullEvent.agenda?.length || 0, 'items');
                    // Only merge in the agenda, keep original event data (including tags) to prevent flash
                    if (fullEvent.agenda && fullEvent.agenda.length > 0) {
                        setEventWithAgenda(prev => ({
                            ...prev,
                            agenda: fullEvent.agenda
                        }));
                    }

                    // Ensure minimum loading time for smooth transition (300ms)
                    await new Promise<void>(resolve => {
                        transitionTimeoutId = setTimeout(resolve, 300);
                    });
                }
            } catch (error) {
                clearTimeout(timeoutId);
                console.warn('[EventDetailPanel] Failed to fetch event agenda, using basic event data:', error);
            } finally {
                if (isMounted) {
                    console.log('[EventDetailPanel] Setting isLoading to false');
                    setIsLoading(false);
                }
            }
        };

        fetchEventWithAgenda();

        return () => {
            isMounted = false;
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            if (transitionTimeoutId) {
                clearTimeout(transitionTimeoutId);
            }
        };
    }, [event.id, event]);


    // Resize logic
    const [width, setWidth] = useState(800); // Default width increased to 800px
    const [isResizing, setIsResizing] = useState(false);
    const sidebarRef = useRef<HTMLDivElement>(null);

    // Initialize width from localStorage if available
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedWidth = localStorage.getItem('eventDetailPanelWidth');
            if (savedWidth) {
                setWidth(Math.max(400, Math.min(parseInt(savedWidth, 10), window.innerWidth * 0.9)));
            }
        }
    }, []);

    const startResizing = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    }, []);

    useEffect(() => {
        const stopResizing = () => {
            if (isResizing) {
                setIsResizing(false);
                localStorage.setItem('eventDetailPanelWidth', width.toString());
            }
        };

        const resize = (mouseMoveEvent: MouseEvent) => {
            if (isResizing) {
                const newWidth = window.innerWidth - mouseMoveEvent.clientX;
                // Constraints: Min 400px, Max 90vw
                if (newWidth >= 400 && newWidth <= window.innerWidth * 0.9) {
                    setWidth(newWidth);
                }
            }
        };

        if (isResizing) {
            window.addEventListener('mousemove', resize);
            window.addEventListener('mouseup', stopResizing);
        }

        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [isResizing, width]);

    // Conditional styling based on variant with glassmorphism
    const containerClasses = variant === 'modal'
        ? `max-h-[85vh] event-detail-glass-modal rounded-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] ring-1 ring-gray-300 dark:ring-white/20 p-6 flex flex-col relative overflow-hidden`
        : `h-full event-detail-glass-sidebar border-l border-gray-300 dark:border-white/10 shadow-2xl p-6 flex flex-col relative bg-clip-padding`;

    return (
        <div
            ref={variant === 'sidebar' ? sidebarRef : undefined}
            className={containerClasses}
            style={variant === 'sidebar' ? { width: `${width}px`, transition: isResizing ? 'none' : 'width 0.1s ease-out' } : undefined}
        >
            {variant === 'sidebar' && (
                <div
                    className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-blue-500/50 transition-colors z-[60] -ml-[3px]"
                    onMouseDown={startResizing}
                    title="Drag to resize"
                />
            )}
            <div className="absolute top-4 right-6 flex items-center gap-2 z-10">
                {/* Open Full Page Action */}
                {/* Open Full Page Action - Internal Event Page */}
                <Link
                    href={`/events/${generateEventSlug(displayEvent.title, ('originalEventId' in displayEvent ? (displayEvent as MultiDayEventInstance).originalEventId : displayEvent.id))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 border border-gray-300 dark:border-white/20 text-gray-700 dark:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                    title="Open full event page"
                >
                    <ArrowSquareOutIcon className="w-4 h-4" />
                </Link>

                {/* Bookmark Action */}
                <button
                    type="button"
                    onClick={handleBookmarkEvent}
                    disabled={isBookmarkLoading || !user}
                    className={`p-2 rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${eventIsBookmarked
                        ? 'bg-yellow-500/15 dark:bg-yellow-500/20 hover:bg-yellow-500/20 dark:hover:bg-yellow-500/30 border-yellow-500/30 dark:border-yellow-500/40 text-yellow-700 dark:text-yellow-400'
                        : 'bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 border-gray-300 dark:border-white/20 text-gray-700 dark:text-gray-300'
                        }`}
                    title={eventIsBookmarked ? 'Unbookmark' : 'Bookmark'}
                >
                    <Bookmark className="w-4 h-4" weight={eventIsBookmarked ? "fill" : "regular"} />
                </button>

                <button
                    type="button"
                    onClick={onClose}
                    className="p-2 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 border border-gray-300 dark:border-white/20 text-gray-700 dark:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                    aria-label="Close event details"
                >
                    <XIcon className="w-4 h-4" />
                </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto pr-2 -mr-2">
                <div className="flex items-start justify-between">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex-1">{displayEvent.title}</h3>
                </div>

                <EventInfo event={displayEvent} category={category} />

                <div className="pt-6 border-t border-zinc-200 dark:border-white/10">
                    <div className="text-[11px] font-medium text-foreground-tertiary uppercase tracking-[0.05em] mb-4">
                        Action
                    </div>
                    <EventTracking event={displayEvent} />
                </div>

                {/* Adaptive Timeline Section */}
                {/* Show loading skeleton while fetching, then timeline or track view if agenda exists */}
                <div className="mt-6 pt-6 border-t border-gray-300 dark:border-white/10">
                    <div className="flex items-center justify-end mb-5">
                        {hasTrackAgenda && (
                            <div className="inline-flex items-center gap-1 rounded-full border border-gray-300 dark:border-white/10 bg-gray-100 dark:bg-white/5 backdrop-blur px-1 py-1">
                                <button
                                    type="button"
                                    onClick={() => setAgendaView('timeline')}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${agendaView === 'timeline'
                                        ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 shadow-sm'
                                        : 'text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                                        }`}
                                    aria-pressed={agendaView === 'timeline'}
                                >
                                    Timeline
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAgendaView('tracks')}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${agendaView === 'tracks'
                                        ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 shadow-sm'
                                        : 'text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                                        }`}
                                    aria-pressed={agendaView === 'tracks'}
                                >
                                    Tracks
                                </button>
                            </div>
                        )}
                    </div>
                    {isLoading ? (
                        <div className="space-y-4 animate-pulse">
                            <div className="flex items-center gap-2">
                                <div className="h-4 w-32 bg-zinc-200/80 dark:bg-zinc-700/60 rounded"></div>
                                <div className="h-3 w-48 bg-zinc-200/60 dark:bg-zinc-800/60 rounded"></div>
                            </div>
                            <div className="space-y-3">
                                <div className="h-20 bg-zinc-200/70 dark:bg-zinc-800/60 rounded"></div>
                                <div className="h-20 bg-zinc-200/60 dark:bg-zinc-800/50 rounded"></div>
                                <div className="h-20 bg-zinc-200/50 dark:bg-zinc-800/40 rounded"></div>
                            </div>
                        </div>
                    ) : displayEvent.agenda && displayEvent.agenda.length > 0 ? (
                        agendaView === 'tracks' && hasTrackAgenda ? (
                            <TrackAgendaView tracks={trackGroups} timezone={displayEvent.timezone} />
                        ) : (
                            <AdaptiveTimeline event={displayEvent} />
                        )
                    ) : null}
                </div>

                {/* Speakers Section */}
                {displayEvent.speakerLineup && displayEvent.speakerLineup.length > 0 && (
                    <div className="pt-6 border-t border-zinc-200 dark:border-white/10">
                        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-300 mb-4">
                            Speakers
                        </h3>
                        <div className="space-y-4">
                            {displayEvent.speakerLineup.map((speaker) => {
                                const { primary: avatarSrc, fallback: fallbackSrc } = getSpeakerAvatarUrls(speaker, 40);

                                return (
                                    <div key={speaker.id} className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-white/10 overflow-hidden shrink-0">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={avatarSrc}
                                                alt={speaker.name}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    if (e.currentTarget.src !== fallbackSrc) {
                                                        e.currentTarget.src = fallbackSrc;
                                                    }
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <div className="font-medium text-zinc-900 dark:text-zinc-200">
                                                {speaker.name}
                                            </div>
                                            {(speaker.title || speaker.company) && (
                                                <div className="text-xs text-zinc-600 dark:text-zinc-500" title={`${speaker.title || ''}${speaker.title && speaker.company ? ' at ' : ''}${speaker.company || ''}`}>
                                                    {speaker.title || speaker.company}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Feedback for attended events (attendance managed from dashboard) */}
                {user && getAttendanceStatus(displayEvent.id) === 'attended' && (
                    <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-white/10">
                        <div className="text-[11px] font-medium text-foreground-tertiary uppercase tracking-[0.05em] mb-4">
                            Your Feedback
                        </div>
                        <EventFeedbackForm event={displayEvent} compact />
                    </div>
                )}
            </div>
        </div>
    );
};

export default EventDetailPanel;
