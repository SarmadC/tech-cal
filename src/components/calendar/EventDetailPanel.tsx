'use client';

import { FC, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { XIcon, ArrowSquareOutIcon, CalendarPlusIcon, ShareNetworkIcon, DotsThreeVerticalIcon, DownloadSimpleIcon } from '@phosphor-icons/react';
import { useTimelineTheme } from '@/hooks/useTimelineTheme';

// 1. UPDATE IMPORTS: Use the new, specific type names.
import { Event, EventType, AgendaItem, MultiDayEventInstance } from '@/types';
import { EventService } from '@/services/eventServices';
import { createClient } from '@/utils/supabase/client';
import EventInfo from './EventInfo';
import EventTracking from './EventTracking';
import AdaptiveTimeline from './AdaptiveTimeline';
import { useEventActions } from '@/hooks/useEventActions';
import { useTrackedEventsUnified } from '@/hooks/useTrackedEventsUnified';
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
    const moreMenuRef = useRef<HTMLDivElement>(null);
    
    // Add tracking functionality
    const { user } = useAuth();
    const { trackedEventIds, trackEvent, untrackEvent, isLoading: isTrackingLoading } = useTrackedEventsUnified();
    
    // Update eventWithAgenda when event prop changes
    useEffect(() => {
        setEventWithAgenda(event);
        setIsLoading(true);
    }, [event]); // Update when event prop changes
    
    // Get the display event (with agenda if available)
    const displayEvent = eventWithAgenda;
    
    // Event actions hook - use displayEvent to ensure it updates with new events
    const { handleShare, googleCalendarLink, handleIcsDownload } = useEventActions(displayEvent);
    
    // Debug: Log the agendaUrl to see if it's populated
    console.log('EventDetailPanel - displayEvent.agendaUrl:', displayEvent.agendaUrl);
    
    // Check if event is tracked
    const isTracked = trackedEventIds?.has(displayEvent.id) ?? false;
    
    // Handle track/untrack event
    const handleTrackEvent = async () => {
        if (!user) {
            return;
        }
        
        if (isTracked) {
            await untrackEvent(displayEvent.id);
        } else {
            await trackEvent(displayEvent.id, 'bookmarked');
        }
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

    // Close more menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
                setShowMoreMenu(false);
            }
        };

        if (showMoreMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showMoreMenu]);

    // Conditional styling based on variant with glassmorphism
    const containerClasses = variant === 'modal'
        ? `max-h-[85vh] event-detail-glass-modal rounded-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] ring-1 ring-white/10 p-6 flex flex-col relative overflow-hidden`
        : `h-full event-detail-glass-sidebar border-l border-white/20 dark:border-white/10 shadow-2xl p-6 flex flex-col relative`;

    return (
        <div 
            className={containerClasses}
            style={{
                background: theme.isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(20px) saturate(120%)',
                WebkitBackdropFilter: 'blur(20px) saturate(120%)',
                border: theme.isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(255, 255, 255, 0.2)'
            }}
        >
            <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 dark:bg-black/20 hover:bg-white/20 dark:hover:bg-white/10 border border-white/20 dark:border-white/10 text-gray-600 dark:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                aria-label="Close event details"
            >
                <XIcon className="w-4 h-4" />
            </button>

            <div className="flex-1 space-y-6 overflow-y-auto pr-2 -mr-2">
                <div className="flex items-start justify-between">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex-1">{displayEvent.title}</h3>

                    {displayEvent.agendaUrl ? (
                        <a
                            href={displayEvent.agendaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-4 p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white/20 dark:hover:bg-white/10 rounded-full transition-colors"
                            title="View full agenda"
                        >
                            <ArrowSquareOutIcon className="w-5 h-5" />
                        </a>
                    ) : (
                        <Link
                            href={`/events/${generateEventSlug(displayEvent.title, displayEvent.id)}`}
                            className="ml-4 p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white/20 dark:hover:bg-white/10 rounded-full transition-colors"
                            title="View full page"
                        >
                            <ArrowSquareOutIcon className="w-5 h-5" />
                        </Link>
                    )}
                </div>

                <EventInfo event={displayEvent} category={category} />
                
                {/* Adaptive Timeline Section */}
                {/* Show loading skeleton while fetching, then timeline if agenda exists */}
                <div className="mt-6 pt-6 border-t border-white/20 dark:border-white/10">
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
                        <AdaptiveTimeline event={displayEvent} />
                    ) : null}
                </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/20 dark:border-white/10">
                {/* All actions in a single container */}
                <div className="p-4">
                    <div className="flex items-center gap-3">
                        {/* Primary CTA - Track Event */}
                        <button 
                            onClick={handleTrackEvent}
                            disabled={isTrackingLoading || !user}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 
                                ${isTracked 
                                    ? 'bg-red-500/90 hover:bg-red-600/90 text-white' 
                                    : 'bg-gray-900/90 hover:bg-gray-800/90 text-white dark:bg-white/90 dark:hover:bg-white/100 dark:text-gray-900'
                                } 
                                backdrop-blur-sm border border-white/20 dark:border-white/10
                                ${isTrackingLoading ? 'opacity-50 cursor-not-allowed' : 'shadow-sm hover:shadow-md'}`}
                        >
                            <CalendarPlusIcon className="w-4 h-4" />
                            <span>{isTracked ? 'Untrack Event' : 'Track Event'}</span>
                        </button>

                        {/* Attendance toggle */}
                        <div className="flex-shrink-0">
                            <EventTracking event={displayEvent} />
                        </div>

                        {/* Share icon-only button */}
                        <button
                            onClick={() => handleShare()}
                            className="flex items-center justify-center px-3 py-3 bg-white/10 dark:bg-black/10 hover:bg-white/20 dark:hover:bg-white/10 rounded-lg transition-colors backdrop-blur-sm border border-white/20 dark:border-white/10"
                            title="Share event"
                        >
                            <ShareNetworkIcon className="w-3.5 h-3.5 text-gray-700 dark:text-gray-300" />
                        </button>

                        {/* More menu */}
                        <div className="relative flex-shrink-0" ref={moreMenuRef}>
                                    <button
                                        onClick={() => setShowMoreMenu(!showMoreMenu)}
                                        className="flex items-center justify-center px-3 py-3 bg-white/10 dark:bg-black/10 hover:bg-white/20 dark:hover:bg-white/10 rounded-lg transition-colors backdrop-blur-sm border border-white/20 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-offset-white"
                                        title="More actions"
                                        aria-expanded={showMoreMenu}
                                        aria-haspopup="true"
                                    >
                                <DotsThreeVerticalIcon className="w-3.5 h-3.5 text-gray-700 dark:text-gray-300" />
                            </button>
                            
                            {/* More menu dropdown */}
                            {showMoreMenu && (
                                <div 
                                    className="absolute right-0 top-full mt-2 w-48 event-preview-glass-section rounded-lg shadow-lg z-10 border border-white/20 dark:border-white/10 backdrop-blur-md"
                                    role="menu"
                                    aria-orientation="vertical"
                                >
                                            <a
                                                href={googleCalendarLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={() => setShowMoreMenu(false)}
                                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-white/10 rounded-t-lg transition-colors focus:outline-none"
                                                role="menuitem"
                                            >
                                        <CalendarPlusIcon className="w-4 h-4" />
                                        <span>Add to Calendar</span>
                                    </a>
                                            <button
                                                onClick={() => {
                                                    handleIcsDownload();
                                                    setShowMoreMenu(false);
                                                }}
                                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-white/10 transition-colors focus:outline-none"
                                                role="menuitem"
                                            >
                                        <DownloadSimpleIcon className="w-4 h-4" />
                                        <span>Download .ics</span>
                                    </button>
                                    <button 
                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-white/10 transition-colors focus:outline-none"
                                        role="menuitem"
                                    >
                                        <DownloadSimpleIcon className="w-4 h-4" />
                                        <span>Export to PDF</span>
                                    </button>
                                    <button 
                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-white/10 rounded-b-lg transition-colors focus:outline-none"
                                        role="menuitem"
                                    >
                                        <DownloadSimpleIcon className="w-4 h-4" />
                                        <span>Print</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EventDetailPanel;
