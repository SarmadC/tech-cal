'use client';

import { FC, useState, useEffect, useMemo } from 'react';
import { XIcon, ArrowSquareOutIcon, Bookmark } from '@phosphor-icons/react';
import { useTimelineTheme } from '@/hooks/useTimelineTheme';

// 1. UPDATE IMPORTS: Use the new, specific type names.
import { Event, EventType, AgendaItem, MultiDayEventInstance } from '@/types';
import { EventService } from '@/services/eventServices';
import { createClient } from '@/utils/supabase/client';
import EventInfo from './EventInfo';
import AdaptiveTimeline from './AdaptiveTimeline';
import TrackAgendaView, { groupAgendaByTrack } from './TrackAgendaView';
import { useEventEngagement } from '@/hooks/useEventEngagement';
import { useAuth } from '@/contexts';
import { generateEventSlug } from '@/utils/slugUtils';

// 2. UPDATE PROPS: The interface now uses the new types.
interface EventDetailPanelProps {
    event: Event;
    onClose: () => void;
    categories: EventType[];
    variant?: 'sidebar' | 'modal';
}

const EventDetailPanel: FC<EventDetailPanelProps> = ({ event, onClose, categories, variant = 'sidebar' }) => {
    const theme = useTimelineTheme();
    const category = categories.find(c => c.id === event.eventTypeId);
    const [eventWithAgenda, setEventWithAgenda] = useState<Event & { agenda?: AgendaItem[] }>(event);
    const [isLoading, setIsLoading] = useState(true);
    const [agendaView, setAgendaView] = useState<'timeline' | 'tracks'>('timeline');

    // Add bookmark functionality
    const { user } = useAuth();
    const { isBookmarked, toggleBookmark, isLoading: isBookmarkLoading } = useEventEngagement();

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

        await toggleBookmark(displayEvent.id, displayEvent as unknown as Record<string, unknown>);
    };

    // Fetch complete event details with agenda
    useEffect(() => {
        let isMounted = true;
        let timeoutId: NodeJS.Timeout;

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
                    await new Promise(resolve => setTimeout(resolve, 300));
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
        };
    }, [event.id, event]);


    // Conditional styling based on variant with glassmorphism
    const containerClasses = variant === 'modal'
        ? `max-h-[85vh] event-detail-glass-modal rounded-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] ring-1 ring-gray-300 dark:ring-white/20 p-6 flex flex-col relative overflow-hidden`
        : `h-full event-detail-glass-sidebar border-l border-gray-300 dark:border-white/10 shadow-2xl p-6 flex flex-col relative`;

    return (
        <div
            className={containerClasses}
            style={{
                background: theme.isDark ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px) saturate(120%)',
                WebkitBackdropFilter: 'blur(20px) saturate(120%)',
                border: theme.isDark ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(0, 0, 0, 0.1)'
            }}
        >
            <div className="absolute top-4 right-6 flex items-center gap-2 z-10">
                {/* Open Full Page Action */}
                <a
                    href={displayEvent.sourceUrl || `/events/${generateEventSlug(displayEvent.title, displayEvent.id)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 border border-gray-300 dark:border-white/20 text-gray-700 dark:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                    title="Open full page"
                >
                    <ArrowSquareOutIcon className="w-4 h-4" />
                </a>

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
                                        ? 'bg-white text-gray-900 shadow-sm'
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
                                        ? 'bg-white text-gray-900 shadow-sm'
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
                                <div className="h-4 w-32 bg-white/10 dark:bg-black/10 rounded backdrop-blur-sm"></div>
                                <div className="h-3 w-48 bg-white/5 dark:bg-black/5 rounded backdrop-blur-sm"></div>
                            </div>
                            <div className="space-y-3">
                                <div className="h-20 bg-white/10 dark:bg-black/10 rounded backdrop-blur-sm"></div>
                                <div className="h-20 bg-white/8 dark:bg-black/8 rounded backdrop-blur-sm"></div>
                                <div className="h-20 bg-white/5 dark:bg-black/5 rounded backdrop-blur-sm"></div>
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
                    <div className="mt-8 pt-6 border-t border-white/10" style={{ borderTopColor: 'rgba(255,255,255,0.08)' }}>
                        <div className="text-[11px] font-medium text-[#757575] uppercase tracking-[0.05em] mb-4">
                            Speakers
                        </div>
                        <div className="flex flex-wrap gap-4">
                            {displayEvent.speakerLineup.map((speaker) => (
                                <div key={speaker.id} className="flex items-center gap-3 min-w-[140px]">
                                    {speaker.photoUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={speaker.photoUrl}
                                            alt={speaker.name}
                                            className="w-8 h-8 rounded-full object-cover bg-white/10"
                                        />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-medium text-white/50">
                                            {speaker.name.charAt(0)}
                                        </div>
                                    )}
                                    <div className="flex flex-col">
                                        <span className="text-[13px] font-medium text-[#E6E6E6] leading-none mb-1">
                                            {speaker.name}
                                        </span>
                                        {(speaker.title || speaker.company) && (
                                            <span className="text-[11px] text-[#757575] leading-none truncate max-w-[120px]" title={`${speaker.title || ''}${speaker.title && speaker.company ? ' at ' : ''}${speaker.company || ''}`}>
                                                {speaker.title || speaker.company}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EventDetailPanel;
