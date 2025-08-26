// src/components/calendar/EventPreviewCard.tsx

import { FC, useRef, useEffect } from 'react';
import {
    Clock, MapPin, Users, ExternalLink, Bookmark, BookmarkCheck,
    Share2, Play, Globe, Calendar
} from 'lucide-react';
// 1. UPDATE IMPORTS: Use the new types and the type guard.
import { Event, EventStatus, isTrackedEvent, TrackedEvent, MultiDayEventInstance } from '@/types';
import { useEventTracking } from '@/hooks/useEventTracking';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { isEventLive, formatTime, formatDate, getEventDuration } from '@/utils/dateUtils';

// 2. UPDATE PROPS: The component can accept either a base Event or an enriched TrackedEvent.
interface EventPreviewCardProps {
    event: Event | TrackedEvent | MultiDayEventInstance;
    isVisible: boolean;
    position: { x: number; y: number };
    onClose: () => void;
    onHover?: () => void;
    onLeave?: () => void;
    isPinned?: boolean;
}

const EventPreviewCard: FC<EventPreviewCardProps> = ({
    event,
    isVisible,
    position,
    onClose,
    onHover,
    onLeave,
    isPinned = false
}) => {
    const { user } = useAuth();
    const { trackEvent, untrackEvent, isLoading } = useEventTracking();

    // Use the tracking status directly from the event prop instead of local state
    const isTracked = isTrackedEvent(event) ? event.isTracked : false;
    const cardRef = useRef<HTMLDivElement>(null);

    // Handle click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isVisible) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isVisible, onClose]);

    // Position the card to avoid going off-screen
    const getCardPosition = () => {
        const cardWidth = 320;
        const cardHeight = 400;
        const padding = 20;

        let x = position.x;
        let y = position.y;

        if (x + cardWidth > window.innerWidth - padding) {
            x = position.x - cardWidth - 20;
        }

        if (y + cardHeight > window.innerHeight - padding) {
            y = window.innerHeight - cardHeight - padding;
        }

        return { x: Math.max(padding, x), y: Math.max(padding, y) };
    };

    const cardPosition = getCardPosition();

    const isVirtual = event.livestreamUrl || event.location?.toLowerCase().includes('virtual');

    // Actions
    const handleTrackEvent = () => {
        console.log('[EventPreviewCard] handleTrackEvent called', { user: !!user, isTracked, eventId: event.id });
        
        if (!user) {
            console.log('[EventPreviewCard] No user authenticated');
            toast.error('Please sign in to track events');
            return;
        }

        // Use originalEventId for multi-day event instances, otherwise use the regular id
        const trackingEventId = ('originalEventId' in event ? (event as MultiDayEventInstance).originalEventId : null) || event.id;
        
        console.log('[EventPreviewCard] Using eventId for tracking:', trackingEventId);

        if (isTracked) {
            console.log('[EventPreviewCard] Untracking event');
            untrackEvent({ eventId: trackingEventId });
        } else {
            console.log('[EventPreviewCard] Tracking event');
            trackEvent({
                eventId: trackingEventId,
                status: 'bookmarked' as EventStatus,
            });
        }
    };

    const handleShare = async () => {
        const shareUrl = event.sourceUrl || window.location.href;

        if (navigator.share && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            try {
                await navigator.share({
                    title: event.title,
                    text: `Check out this tech event: ${event.title}`,
                    url: shareUrl
                });
                return;
            } catch {
                // Fallback to clipboard
            }
        }

        await navigator.clipboard.writeText(shareUrl);
        toast.success('Event link copied to clipboard');
    };

    if (!isVisible) return null;

    return (
        <div
            ref={cardRef}
            className={`fixed z-50 w-80 bg-white dark:bg-gray-800 border rounded-lg shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200 ${
                isPinned 
                    ? 'border-blue-400 dark:border-blue-500 shadow-blue-200 dark:shadow-blue-900' 
                    : 'border-gray-200 dark:border-gray-600'
            }`}
            style={{
                left: `${cardPosition.x}px`,
                top: `${cardPosition.y}px`,
            }}
            onMouseEnter={onHover}
            onMouseLeave={onLeave}
        >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 border-b border-gray-200 dark:border-gray-600">
                <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2 flex-wrap gap-1">
                        {event.tags && event.tags.length > 0 ? (
                            event.tags.slice(0, 2).map((tag, index) => (
                                <span
                                    key={index}
                                    className="px-2 py-1 text-xs font-medium text-white rounded-full"
                                    style={{ backgroundColor: tag.color || '#3b82f6' }}
                                >
                                    {tag.name}
                                </span>
                            ))
                        ) : (
                            event.eventTypeId && (
                                <span className="px-2 py-1 text-xs font-medium bg-blue-500 text-white rounded-full">
                                    Event
                                </span>
                            )
                        )}
                        {event.tags && event.tags.length > 2 && (
                            <span className="px-2 py-1 text-xs font-medium bg-gray-500 text-white rounded-full">
                                +{event.tags.length - 2}
                            </span>
                        )}
                        {isEventLive(event.startTime, event.endTime) && (
                            <span className="px-2 py-1 text-xs font-medium bg-red-500 text-white rounded-full flex items-center">
                                <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-1" />
                                Live
                            </span>
                        )}
                        {isPinned && (
                            <span className="px-2 py-1 text-xs font-medium bg-blue-500 text-white rounded-full">
                                📌 Pinned
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors text-lg leading-none"
                    >
                        ×
                    </button>
                </div>

                <h3 className="font-semibold text-lg text-gray-900 dark:text-white line-clamp-2 leading-tight">
                    {event.title}
                </h3>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span>{formatDate(event.startTime, event.timezone)} • {formatTime(event.startTime, event.timezone)}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                    {isVirtual ? (
                        <Globe className="w-4 h-4 text-blue-500" />
                    ) : (
                        <MapPin className="w-4 h-4 text-gray-500" />
                    )}
                    <span className="line-clamp-1">
                        {isVirtual ? 'Virtual Event' : (event.location || 'Location TBA')}
                    </span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span className="line-clamp-1">{event.organizer}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span>{getEventDuration(event.startTime, event.endTime)}</span>
                </div>
                {event.description && (
                    <div className="pt-2">
                        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 leading-relaxed">
                            {event.description}
                        </p>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
                <div className="flex space-x-2">
                    <button
                        onClick={handleTrackEvent}
                        disabled={isLoading}
                        className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            isLoading 
                                ? 'bg-gray-400 text-white cursor-not-allowed'
                                : isTracked
                                    ? 'bg-green-600 text-white hover:bg-green-700'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                    >
                        {isTracked ? (
                            <>
                                <BookmarkCheck className="w-4 h-4" />
                                <span>Tracked</span>
                            </>
                        ) : (
                            <>
                                <Bookmark className="w-4 h-4" />
                                <span>Track</span>
                            </>
                        )}
                    </button>
                    <button
                        onClick={handleShare}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                        title="Share event"
                    >
                        <Share2 className="w-4 h-4" />
                    </button>
                    {event.sourceUrl && (
                        <button
                            onClick={() => window.open(event.sourceUrl, '_blank')}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                            title="View event details"
                        >
                            <ExternalLink className="w-4 h-4" />
                        </button>
                    )}
                    {event.livestreamUrl && (
                        <button
                            onClick={() => window.open(event.livestreamUrl!, '_blank')}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            title="Join live stream"
                        >
                            <Play className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EventPreviewCard;