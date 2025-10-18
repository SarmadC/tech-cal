'use client';

import { FC, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { XIcon, ArrowSquareOutIcon, CalendarPlusIcon, ShareNetworkIcon, DotsThreeVerticalIcon, DownloadSimpleIcon } from '@phosphor-icons/react';
import { Event, EventType, AgendaItem, MultiDayEventInstance } from '@/types';
import { EventService } from '@/services/eventServices';
import { createClient } from '@/utils/supabase/client';
import EventInfo from '../EventInfo';
import EventTracking from '../EventTracking';
import { useEventActions } from '@/hooks/useEventActions';
import { useTrackedEventsUnified } from '@/hooks/useTrackedEventsUnified';
import { useAuth } from '@/contexts';
import { generateEventSlug } from '@/utils/slugUtils';

interface MobileEventDetailPanelProps {
    event: Event;
    onClose: () => void;
    categories: EventType[];
}

const MobileEventDetailPanel: FC<MobileEventDetailPanelProps> = ({ event, onClose, categories }) => {
    const category = categories.find(c => c.id === event.eventTypeId);
    const [eventWithAgenda, setEventWithAgenda] = useState<Event & { agenda?: AgendaItem[] }>(event);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [showFullDescription, setShowFullDescription] = useState(false);
    const moreMenuRef = useRef<HTMLDivElement>(null);
    
    // Add tracking functionality
    const { user } = useAuth();
    const { trackedEventIds, trackEvent, untrackEvent, isLoading: isTrackingLoading } = useTrackedEventsUnified();
    
    // Update eventWithAgenda when event prop changes
    useEffect(() => {
        setEventWithAgenda(event);
    }, [event]);
    
    // Get the display event (with agenda if available)
    const displayEvent = eventWithAgenda;
    
    // Event actions hook - use displayEvent to ensure it updates with new events
    const { handleShare, googleCalendarLink, handleIcsDownload } = useEventActions(displayEvent);
    
    // Check if event is tracked
    const isTracked = trackedEventIds?.has(displayEvent.id) ?? false;

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
            if (event.agenda && event.agenda.length > 0) {
                return;
            }
            
            try {
                timeoutId = setTimeout(() => {
                    if (isMounted) {
                    }
                }, 10000);
                
                const supabase = createClient();
                const fetchEventId = ('originalEventId' in event ? (event as MultiDayEventInstance).originalEventId : null) || event.id;
                
                const fullEvent = await EventService.getEventWithAgenda(fetchEventId, supabase);
                
                clearTimeout(timeoutId);
                
                if (isMounted) {
                    if (fullEvent.agenda && fullEvent.agenda.length > 0) {
                        setEventWithAgenda(prev => ({
                            ...prev,
                            agenda: fullEvent.agenda
                        }));
                    }
                    
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            } catch (error) {
                clearTimeout(timeoutId);
                console.warn('Failed to fetch event agenda:', error);
            } finally {
                if (isMounted) {
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

    // Mobile-optimized container classes
    const containerClasses = `fixed inset-0 z-50 bg-white dark:bg-gray-900 overflow-y-auto`;

    const toggleDescription = () => {
        setShowFullDescription(!showFullDescription);
    };

    const getDescriptionPreview = (description: string, maxLength: number = 150) => {
        if (description.length <= maxLength) return description;
        return description.substring(0, maxLength) + '...';
    };

    return (
        <div className={containerClasses}>
            {/* Mobile Header - Fixed */}
            <div className="sticky top-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                        {/* Small logo in header */}
                        <div className="flex-shrink-0 w-8 h-8 rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
                            {displayEvent.eventImageUrl ? (
                                <Image
                                    src={displayEvent.eventImageUrl}
                                    alt={`${displayEvent.title} event image`}
                                    width={32}
                                    height={32}
                                    className="w-full h-full object-cover"
                                />
                            ) : displayEvent.organization?.logo ? (
                                <Image
                                    src={displayEvent.organization.logo}
                                    alt={`${displayEvent.organization.name} logo`}
                                    width={24}
                                    height={24}
                                    className="w-6 h-6 object-contain"
                                />
                            ) : (
                                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                    <span className="text-xs font-bold text-white">
                                        {displayEvent.title.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            )}
                        </div>
                        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {displayEvent.title}
                        </h1>
                </div>
                    <button
                        onClick={onClose}
                        className="flex-shrink-0 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ml-2"
                        aria-label="Close"
                    >
                        <XIcon size={24} className="text-gray-600 dark:text-gray-400" />
                    </button>
                </div>
            </div>

            {/* Mobile Content - Scrollable */}
                    <div className="p-4 space-y-6">
                {/* Prominent Logo/Organizer Section */}
                <div className="flex flex-col items-center space-y-4 py-6">
                    {/* Event/Organization Logo */}
                    <div className="relative">
                        <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center shadow-lg">
                            {displayEvent.eventImageUrl ? (
                                <Image
                                    src={displayEvent.eventImageUrl}
                                    alt={`${displayEvent.title} event image`}
                                    width={96}
                                    height={96}
                                    className="w-full h-full object-cover"
                                />
                            ) : displayEvent.organization?.logo ? (
                                <Image
                                    src={displayEvent.organization.logo}
                                    alt={`${displayEvent.organization.name} logo`}
                                    width={64}
                                    height={64}
                                    className="w-16 h-16 object-contain"
                                />
                            ) : (
                                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                    <span className="text-2xl font-bold text-white">
                                        {displayEvent.title.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            )}
                        </div>
                        {/* Glow effect */}
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-400/20 to-purple-400/20 blur-xl -z-10" />
                    </div>
                    
                    {/* Organization Name */}
                    {displayEvent.organization?.name && (
                        <div className="text-center">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Organized by</p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                {displayEvent.organization.name}
                            </p>
                                </div>
                            )}
                        </div>

                        {/* Event Info */}
                        <div className="space-y-4">
                    <EventInfo 
                        event={displayEvent} 
                        category={category}
                    />
                </div>

                {/* Event Description - Mobile Optimized */}
                {displayEvent.description && (
                    <div className="space-y-3">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                            Description
                        </h3>
                        <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            {showFullDescription ? (
                                <div>
                                    {displayEvent.description}
                                    <button
                                        onClick={toggleDescription}
                                        className="block mt-2 text-blue-600 dark:text-blue-400 hover:underline"
                                    >
                                        Show less
                                    </button>
                                </div>
                            ) : (
                                    <div>
                                    {getDescriptionPreview(displayEvent.description)}
                                    {displayEvent.description.length > 150 && (
                                        <button
                                            onClick={toggleDescription}
                                            className="block mt-2 text-blue-600 dark:text-blue-400 hover:underline"
                                        >
                                            Read more
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                            </div>
                        )}

                {/* Event Tracking */}
                <div className="space-y-3">
                    <EventTracking event={displayEvent} />
                </div>

                                        </div>
                                        
            {/* Mobile Action Bar - Fixed Bottom */}
            <div className="sticky bottom-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center gap-3">
                    {/* Track Event Button */}
                    <button
                        onClick={handleTrackEvent}
                        disabled={isTrackingLoading}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                            isTracked
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                    >
                        <CalendarPlusIcon size={18} weight={isTracked ? 'fill' : 'regular'} />
                        {isTracked ? 'Tracking' : 'Track Event'}
                    </button>

                    {/* Share Button */}
                    <button
                        onClick={handleShare}
                        className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        aria-label="Share event"
                    >
                        <ShareNetworkIcon size={18} />
                    </button>

                    {/* More Options */}
                    <div className="relative" ref={moreMenuRef}>
                        <button
                            onClick={() => setShowMoreMenu(!showMoreMenu)}
                            className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            aria-label="More options"
                        >
                            <DotsThreeVerticalIcon size={18} />
                        </button>

                        {/* More Menu Dropdown */}
                        {showMoreMenu && (
                            <div className="absolute bottom-full right-0 mb-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1">
                                <a
                                    href={googleCalendarLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    onClick={() => setShowMoreMenu(false)}
                                >
                                    <CalendarPlusIcon size={16} />
                                    Add to Google Calendar
                                </a>
                                <button
                                                            onClick={() => {
                                        handleIcsDownload();
                                        setShowMoreMenu(false);
                                    }}
                                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
                                >
                                    <DownloadSimpleIcon size={16} />
                                    Download ICS
                                </button>
                                <Link
                                    href={`/events/${generateEventSlug(displayEvent.title, displayEvent.id)}`}
                                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    onClick={() => setShowMoreMenu(false)}
                                >
                                    <ArrowSquareOutIcon size={16} />
                                    View Full Page
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MobileEventDetailPanel;
