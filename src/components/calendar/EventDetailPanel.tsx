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

// 2. UPDATE PROPS: The interface now uses the new types.
interface EventDetailPanelProps {
    event: Event;
    onClose: () => void;
    categories: EventType[];
}

const EventDetailPanel: FC<EventDetailPanelProps> = ({ event, onClose, categories }) => {
    const theme = useTimelineTheme();
    const category = categories.find(c => c.id === event.eventTypeId);
    const [eventWithAgenda, setEventWithAgenda] = useState<Event & { agenda?: AgendaItem[] } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const moreMenuRef = useRef<HTMLDivElement>(null);
    const { handleShare, googleCalendarLink, handleIcsDownload } = useEventActions(event);
    
    // Add tracking functionality
    const { user } = useAuth();
    const { trackedEventIds, trackEvent, untrackEvent, isLoading: isTrackingLoading } = useTrackedEventsUnified();
    
    // Get the display event (with agenda if available)
    const displayEvent = eventWithAgenda || event;
    
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
        const fetchEventWithAgenda = async () => {
            try {
                setIsLoading(true);
                const supabase = createClient();
                // Use originalEventId for multi-day instances, otherwise the regular id
                const fetchEventId = ('originalEventId' in event ? (event as MultiDayEventInstance).originalEventId : null) || event.id;
                const fullEvent = await EventService.getEventWithAgenda(fetchEventId, supabase);
                setEventWithAgenda(fullEvent);
            } catch (error) {
                console.warn('Failed to fetch event agenda, using basic event data:', error);
                setEventWithAgenda(event);
            } finally {
                setIsLoading(false);
            }
        };

        fetchEventWithAgenda();
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

    return (
        <div className={`h-full ${theme.modalBg} border-l ${theme.borderCard} shadow-2xl p-6 flex flex-col relative`}>
            <div className="flex items-center justify-between mb-6">
                <h2 className={`text-lg font-semibold ${theme.textPrimary} font-dm-sans`}>Event Details</h2>
                <button onClick={onClose} className={`p-2 ${theme.hoverCard} rounded-full transition-colors`}>
                    <XIcon className={`w-5 h-5 ${theme.textMuted}`} />
                </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto pr-2 -mr-2">
                <div className="flex items-start justify-between">
                    <h3 className={`text-2xl font-bold ${theme.textPrimary} flex-1`}>{displayEvent.title}</h3>

                    <Link
                        href={`/events/${displayEvent.id}`}
                        className={`ml-4 p-2 ${theme.textMuted} ${theme.hoverText} ${theme.hoverCard} rounded-full transition-colors`}
                        title="View full page"
                    >
                        <ArrowSquareOutIcon className="w-5 h-5" />
                    </Link>
                </div>

                <EventInfo event={displayEvent} category={category} />
                
                {/* Adaptive Timeline Section */}
                <div className={`mt-6 pt-6 border-t ${theme.borderCard}`}>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className={`${theme.textMuted} text-sm`}>Loading agenda...</div>
                        </div>
                    ) : (
                        <AdaptiveTimeline event={displayEvent} />
                    )}
                </div>
            </div>

            <div className={`mt-6 pt-4 border-t ${theme.borderCard}`}>
                {/* All actions in a single container */}
                <div className="p-4">
                    <div className="flex items-center gap-3">
                        {/* Primary CTA - Track Event */}
                        <button 
                            onClick={handleTrackEvent}
                            disabled={isTrackingLoading || !user}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md ${
                                isTracked ? theme.btnDanger : theme.btnPrimary
                            } ${isTrackingLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                                    className={`flex items-center justify-center px-3 py-3 ${theme.btnSecondary} rounded-lg transition-colors`}
                                    title="Share event"
                                >
                            <ShareNetworkIcon className={`w-3.5 h-3.5 ${theme.textSecondary}`} />
                        </button>

                        {/* More menu */}
                        <div className="relative flex-shrink-0" ref={moreMenuRef}>
                                    <button
                                        onClick={() => setShowMoreMenu(!showMoreMenu)}
                                        className={`flex items-center justify-center px-3 py-3 ${theme.btnSecondary} rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${theme.isDark ? 'focus:ring-offset-gray-800' : 'focus:ring-offset-white'}`}
                                        title="More actions"
                                        aria-expanded={showMoreMenu}
                                        aria-haspopup="true"
                                    >
                                <DotsThreeVerticalIcon className={`w-3.5 h-3.5 ${theme.textSecondary}`} />
                            </button>
                            
                            {/* More menu dropdown */}
                            {showMoreMenu && (
                                <div 
                                    className={`absolute right-0 top-full mt-2 w-48 ${theme.modalBg} ${theme.modalBorder} rounded-lg shadow-lg z-10`}
                                    role="menu"
                                    aria-orientation="vertical"
                                >
                                            <a
                                                href={googleCalendarLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={() => setShowMoreMenu(false)}
                                                className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm ${theme.modalTextSecondary} ${theme.hoverCard} rounded-t-lg transition-colors focus:outline-none`}
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
                                                className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm ${theme.modalTextSecondary} ${theme.hoverCard} transition-colors focus:outline-none`}
                                                role="menuitem"
                                            >
                                        <DownloadSimpleIcon className="w-4 h-4" />
                                        <span>Download .ics</span>
                                    </button>
                                    <button 
                                        className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm ${theme.modalTextSecondary} ${theme.hoverCard} transition-colors focus:outline-none`}
                                        role="menuitem"
                                    >
                                        <DownloadSimpleIcon className="w-4 h-4" />
                                        <span>Export to PDF</span>
                                    </button>
                                    <button 
                                        className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm ${theme.modalTextSecondary} ${theme.hoverCard} rounded-b-lg transition-colors focus:outline-none`}
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