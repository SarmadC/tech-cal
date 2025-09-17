'use client';

import { FC, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { XIcon, ArrowSquareOutIcon, CalendarPlusIcon, ShareNetworkIcon, DotsThreeVerticalIcon, DownloadSimpleIcon } from '@phosphor-icons/react';

// 1. UPDATE IMPORTS: Use the new, specific type names.
import { Event, EventType, AgendaItem, MultiDayEventInstance } from '@/types';
import { EventService } from '@/services/eventServices';
import { createClient } from '@/utils/supabase/client';
import EventInfo from './EventInfo';
import EventTracking from './EventTracking';
import AdaptiveTimeline from './AdaptiveTimeline';
import { useEventActions } from '@/hooks/useEventActions';

// 2. UPDATE PROPS: The interface now uses the new types.
interface EventDetailPanelProps {
    event: Event;
    onClose: () => void;
    categories: EventType[];
}

const EventDetailPanel: FC<EventDetailPanelProps> = ({ event, onClose, categories }) => {
    const category = categories.find(c => c.id === event.eventTypeId);
    const [eventWithAgenda, setEventWithAgenda] = useState<Event & { agenda?: AgendaItem[] } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const moreMenuRef = useRef<HTMLDivElement>(null);
    const { handleShare, googleCalendarLink, handleIcsDownload } = useEventActions(event);

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

    const displayEvent = eventWithAgenda || event;

    return (
        <div className="h-full bg-[#1e1e1e] border-l border-gray-800 shadow-2xl p-6 flex flex-col relative">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white font-dm-sans">Event Details</h2>
                <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-full transition-colors">
                    <XIcon className="w-5 h-5 text-gray-400" />
                </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto pr-2 -mr-2">
                <div className="flex items-start justify-between">
                    <h3 className="text-2xl font-bold text-white flex-1">{displayEvent.title}</h3>

                    <Link
                        href={`/events/${displayEvent.id}`}
                        className="ml-4 p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
                        title="View full page"
                    >
                        <ArrowSquareOutIcon className="w-5 h-5" />
                    </Link>
                </div>

                <EventInfo event={displayEvent} category={category} />
                
                {/* Adaptive Timeline Section */}
                <div className="mt-6 pt-6 border-t border-gray-800">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="text-gray-400 text-sm">Loading agenda...</div>
                        </div>
                    ) : (
                        <AdaptiveTimeline event={displayEvent} />
                    )}
                </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-800">
                {/* All actions in a single container */}
                <div className="p-4">
                    <div className="flex items-center gap-3">
                        {/* Primary CTA - Track Event */}
                        <button 
                            onClick={() => {
                                // This would need to be connected to the tracking functionality
                                console.log('Track event clicked');
                            }}
                            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-zinc-200 hover:bg-zinc-300 text-zinc-900 rounded-lg font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                            <CalendarPlusIcon className="w-4 h-4" />
                            <span>Track Event</span>
                        </button>

                        {/* Attendance toggle */}
                        <div className="flex-shrink-0">
                            <EventTracking event={displayEvent} />
                        </div>

                        {/* Share icon-only button */}
                        <button 
                            onClick={() => handleShare()}
                            className="flex items-center justify-center px-3 py-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-colors border border-gray-600/30"
                            title="Share event"
                        >
                            <ShareNetworkIcon className="w-3.5 h-3.5 text-gray-300" />
                        </button>

                        {/* More menu */}
                        <div className="relative flex-shrink-0" ref={moreMenuRef}>
                            <button 
                                onClick={() => setShowMoreMenu(!showMoreMenu)}
                                className="flex items-center justify-center px-3 py-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-colors border border-gray-600/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                                title="More actions"
                                aria-expanded={showMoreMenu}
                                aria-haspopup="true"
                            >
                                <DotsThreeVerticalIcon className="w-3.5 h-3.5 text-gray-300" />
                            </button>
                            
                            {/* More menu dropdown */}
                            {showMoreMenu && (
                                <div 
                                    className="absolute right-0 top-full mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10"
                                    role="menu"
                                    aria-orientation="vertical"
                                >
                                    <a 
                                        href={googleCalendarLink} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        onClick={() => setShowMoreMenu(false)}
                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 rounded-t-lg transition-colors focus:outline-none focus:bg-gray-700"
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
                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 transition-colors focus:outline-none focus:bg-gray-700"
                                        role="menuitem"
                                    >
                                        <DownloadSimpleIcon className="w-4 h-4" />
                                        <span>Download .ics</span>
                                    </button>
                                    <button 
                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 transition-colors focus:outline-none focus:bg-gray-700"
                                        role="menuitem"
                                    >
                                        <DownloadSimpleIcon className="w-4 h-4" />
                                        <span>Export to PDF</span>
                                    </button>
                                    <button 
                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 rounded-b-lg transition-colors focus:outline-none focus:bg-gray-700"
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