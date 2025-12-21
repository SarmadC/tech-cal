'use client';

import { FC, useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { XIcon, ArrowSquareOutIcon, ShareNetworkIcon, DotsThreeVerticalIcon, DownloadSimpleIcon, Bookmark } from '@phosphor-icons/react';
import { useTimelineTheme } from '@/hooks/useTimelineTheme';

// 1. UPDATE IMPORTS: Use the new, specific type names.
import { Event, EventType, AgendaItem, MultiDayEventInstance } from '@/types';
import { EventService } from '@/services/eventServices';
import { createClient } from '@/utils/supabase/client';
import EventInfo from './EventInfo';
import AdaptiveTimeline from './AdaptiveTimeline';
import TrackAgendaView, { groupAgendaByTrack } from './TrackAgendaView';
import { useEventActions } from '@/hooks/useEventActions';
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
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
    const moreMenuRef = useRef<HTMLDivElement>(null);
    const moreMenuButtonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
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
    
    // Event actions hook - use displayEvent to ensure it updates with new events
    const { handleShare, handleIcsDownload } = useEventActions(displayEvent);
    
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

    // Calculate dropdown position when menu opens
    useEffect(() => {
        if (showMoreMenu && moreMenuButtonRef.current) {
            const buttonRect = moreMenuButtonRef.current.getBoundingClientRect();
            // Approximate dropdown height: 2 items * ~46px each = ~92px
            const dropdownHeight = 92;
            const spacing = 8; // mb-2 spacing
            // Position dropdown above the button, aligned to left
            setDropdownPosition({
                top: buttonRect.top - dropdownHeight - spacing,
                left: buttonRect.left,
            });
        } else {
            setDropdownPosition(null);
        }
    }, [showMoreMenu]);

    // Close more menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const clickedInsideMenu = moreMenuRef.current?.contains(target);
            const clickedInsideDropdown = dropdownRef.current?.contains(target);
            if (!clickedInsideMenu && !clickedInsideDropdown) {
                setShowMoreMenu(false);
            }
        };

        if (showMoreMenu) {
            document.addEventListener('mousedown', handleClickOutside);
            // Also recalculate position on scroll/resize
            const handleReposition = () => {
                if (moreMenuButtonRef.current) {
                    const buttonRect = moreMenuButtonRef.current.getBoundingClientRect();
                    const dropdownHeight = 92;
                    const spacing = 8;
                    setDropdownPosition({
                        top: buttonRect.top - dropdownHeight - spacing,
                        left: buttonRect.left,
                    });
                }
            };
            window.addEventListener('scroll', handleReposition, true);
            window.addEventListener('resize', handleReposition);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
                window.removeEventListener('scroll', handleReposition, true);
                window.removeEventListener('resize', handleReposition);
            };
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showMoreMenu]);

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
            <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-6 p-2 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 border border-gray-300 dark:border-white/20 text-gray-700 dark:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 z-10"
                aria-label="Close event details"
            >
                <XIcon className="w-4 h-4" />
            </button>

            <div className="flex-1 space-y-6 overflow-y-auto pr-2 -mr-2">
                <div className="flex items-start justify-between">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex-1">{displayEvent.title}</h3>
                </div>

                <EventInfo event={displayEvent} category={category} />
                
                {/* Adaptive Timeline Section */}
                {/* Show loading skeleton while fetching, then timeline or track view if agenda exists */}
                <div className="mt-6 pt-6 border-t border-gray-300 dark:border-white/10">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <p className="text-xs font-semibold tracking-widest text-gray-500 dark:text-gray-400 uppercase">
                                Agenda
                            </p>
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {agendaView === 'tracks' ? 'Track View' : 'Timeline View'}
                            </h4>
                        </div>
                        {hasTrackAgenda && (
                            <div className="inline-flex items-center gap-1 rounded-full border border-gray-300 dark:border-white/10 bg-gray-100 dark:bg-white/5 backdrop-blur px-1 py-1">
                                <button
                                    type="button"
                                    onClick={() => setAgendaView('timeline')}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                                        agendaView === 'timeline'
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
                                    className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                                        agendaView === 'tracks'
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
            </div>

            <div className="mt-6 pt-4 border-t border-gray-300 dark:border-white/10">
                {/* All actions in a container */}
                <div className="p-4">
                    <div className="flex items-center gap-3">
                        {/* Primary CTA - Bookmark (takes most space) */}
                        <button 
                            onClick={handleBookmarkEvent}
                            disabled={isBookmarkLoading || !user}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 backdrop-blur-sm
                                ${eventIsBookmarked 
                                    ? 'bg-yellow-500/15 dark:bg-yellow-500/20 hover:bg-yellow-500/20 dark:hover:bg-yellow-500/30 border border-yellow-500/30 dark:border-yellow-500/40 text-yellow-700 dark:text-yellow-400'
                                    : 'bg-gray-900 dark:bg-white/90 hover:bg-gray-800 dark:hover:bg-white/100 text-white dark:text-gray-900 border border-gray-800 dark:border-white/10'
                                } 
                                ${isBookmarkLoading ? 'opacity-50 cursor-not-allowed' : 'shadow-sm hover:shadow-md'}`}
                        >
                            <Bookmark className="w-4 h-4" weight={eventIsBookmarked ? "fill" : "regular"} />
                            <span>{eventIsBookmarked ? 'Unbookmark' : 'Bookmark'}</span>
                        </button>

                        {/* More menu */}
                        <div className="relative flex-shrink-0" ref={moreMenuRef}>
                            <button
                                ref={moreMenuButtonRef}
                                onClick={() => setShowMoreMenu(!showMoreMenu)}
                                className="flex items-center justify-center px-3 py-3 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 rounded-lg transition-colors backdrop-blur-sm border border-gray-300 dark:border-white/20 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-offset-white"
                                title="More actions"
                                aria-expanded={showMoreMenu}
                                aria-haspopup="true"
                            >
                                <DotsThreeVerticalIcon className="w-3.5 h-3.5 text-gray-700 dark:text-gray-300" />
                            </button>
                            
                            {/* More menu dropdown - rendered via portal to avoid overflow clipping */}
                            {showMoreMenu && dropdownPosition && typeof document !== 'undefined' && createPortal(
                                <div 
                                    ref={dropdownRef}
                                    className="fixed w-48 event-preview-glass-section rounded-lg shadow-lg z-[9999] border border-gray-300 dark:border-white/10 backdrop-blur-md bg-white dark:bg-gray-800"
                                    style={{
                                        top: `${dropdownPosition.top}px`,
                                        left: `${dropdownPosition.left}px`,
                                    }}
                                    role="menu"
                                    aria-orientation="vertical"
                                >
                                    {/* Share option - first item */}
                                    <button
                                        onClick={() => {
                                            handleShare();
                                            setShowMoreMenu(false);
                                        }}
                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-t-lg transition-colors focus:outline-none border-b border-gray-200 dark:border-white/10"
                                        role="menuitem"
                                    >
                                        <ShareNetworkIcon className="w-4 h-4" />
                                        <span>Share</span>
                                    </button>
                                    
                                    {displayEvent.agendaUrl ? (
                                        <a
                                            href={displayEvent.agendaUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={() => setShowMoreMenu(false)}
                                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors focus:outline-none border-b border-gray-200 dark:border-white/10"
                                            role="menuitem"
                                        >
                                            <ArrowSquareOutIcon className="w-4 h-4" />
                                            <span>View full agenda</span>
                                        </a>
                                    ) : (
                                        <a
                                            href={displayEvent.sourceUrl || `/events/${generateEventSlug(displayEvent.title, displayEvent.id)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={() => setShowMoreMenu(false)}
                                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors focus:outline-none border-b border-gray-200 dark:border-white/10"
                                            role="menuitem"
                                        >
                                            <ArrowSquareOutIcon className="w-4 h-4" />
                                            <span>View full page</span>
                                        </a>
                                    )}
                                    <button
                                        onClick={() => {
                                            handleIcsDownload();
                                            setShowMoreMenu(false);
                                        }}
                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-b-lg transition-colors focus:outline-none"
                                        role="menuitem"
                                    >
                                        <DownloadSimpleIcon className="w-4 h-4" />
                                        <span>Download .ics</span>
                                    </button>
                                </div>,
                                document.body
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EventDetailPanel;
