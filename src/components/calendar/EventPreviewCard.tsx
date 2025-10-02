// src/components/calendar/EventPreviewCard.tsx

import { FC, useRef, RefObject } from 'react';
import {
    ClockIcon, MapPinIcon, UsersIcon, ArrowSquareOutIcon, BookmarkIcon, BookmarkSimpleIcon,
    ShareNetworkIcon, PlayCircleIcon, GlobeIcon, CalendarIcon
} from '@phosphor-icons/react';
import { useClickOutside } from '@/hooks/useEventListener';
// 1. UPDATE IMPORTS: Use the new types and the type guard.
import { Event, TrackedEvent, MultiDayEventInstance } from '@/types';
import { CareerImpactScoreLite } from '@/types/careerImpact';
import { useTrackedEventsUnified } from '@/hooks/useTrackedEventsUnified';
import { useAuth } from '@/contexts/AuthContext';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { isEventLive, formatTime, formatDate, getEventDuration } from '@/utils/dateUtils';
import { getEventStatus } from '@/utils/eventStatusUtils';
import { CareerImpactBadge } from '@/components/ui/career-impact-badge';

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
    const { showError, showSuccess } = useSnackbar();
    const { trackEvent, untrackEvent, isLoading } = useTrackedEventsUnified();

    // Use the tracking status directly from the event prop instead of local state
    const { isTracked } = getEventStatus(event);
    const cardRef = useRef<HTMLDivElement>(null) as RefObject<HTMLDivElement>;

    // Handle click outside to close
    useClickOutside(cardRef, () => onClose(), isVisible);

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
    const handleTrackEvent = async () => {
        
        if (!user) {
            showError('Please sign in to track events');
            return;
        }

        // Use originalEventId for multi-day event instances, otherwise use the regular id
        const trackingEventId = ('originalEventId' in event ? (event as MultiDayEventInstance).originalEventId : null) || event.id;
        

        if (isTracked) {
            await untrackEvent(trackingEventId);
        } else {
            await trackEvent(trackingEventId);
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
        showSuccess('Event link copied to clipboard');
    };

    if (!isVisible) return null;

    return (
        <div
            ref={cardRef}
            className={`fixed z-50 w-80 bg-white dark:bg-gray-800 border rounded-lg shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200 ${
                isPinned 
                    ? 'border-zinc-300 dark:border-zinc-400 shadow-zinc-200 dark:shadow-black/40' 
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
            <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 border-b border-gray-200 dark:border-gray-600">
                <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2 flex-wrap gap-1">
                        {event.tags && event.tags.length > 0 ? (
                            event.tags.slice(0, 2).map((tag, index) => (
                                <span
                                    key={index}
                                    className="px-2 py-1 text-xs font-medium text-gray-900 dark:text-white rounded-md bg-gray-200 dark:bg-gray-600"
                                >
                                    {tag.name}
                                </span>
                            ))
                        ) : (
                            event.eventTypeId && (
                                <span className="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-900 dark:bg-gray-600 dark:text-white rounded-md">
                                    Event
                                </span>
                            )
                        )}
                        {event.tags && event.tags.length > 2 && (
                            <span className="px-2 py-1 text-xs font-medium bg-gray-500 text-white rounded-md">
                                +{event.tags.length - 2}
                            </span>
                        )}
                        {isEventLive(event.startTime, event.endTime) && (
                            <span className="px-2 py-1 text-xs font-medium bg-red-500 text-white rounded-md flex items-center">
                                <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-1" />
                                Live
                            </span>
                        )}
                        {isPinned && (
                            <span className="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-900 dark:bg-gray-600 dark:text-white rounded-md flex items-center gap-1">
                                <BookmarkSimpleIcon className="w-3.5 h-3.5" />
                                <span>Pinned</span>
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

                <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white line-clamp-2 leading-tight flex-1">
                        {event.title}
                    </h3>
                    {/* Career Impact Badge in Preview */}
                    {(event as Event & { careerImpactLite?: CareerImpactScoreLite }).careerImpactLite && (
                        <div className="flex-shrink-0">
                            <CareerImpactBadge 
                                score={(event as Event & { careerImpactLite?: CareerImpactScoreLite }).careerImpactLite!}
                                variant="compact"
                                showTooltip={false}
                                className="text-xs"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                    <ClockIcon className="w-4 h-4 text-gray-500" />
                    <span>{formatDate(event.startTime, event.timezone)} • {formatTime(event.startTime, event.timezone)}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                    {isVirtual ? (
                        <GlobeIcon className="w-4 h-4 text-gray-500" />
                    ) : (
                        <MapPinIcon className="w-4 h-4 text-gray-500" />
                    )}
                    <span className="line-clamp-1">
                        {isVirtual ? 'Virtual Event' : (event.location || 'Location TBA')}
                    </span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                    <UsersIcon className="w-4 h-4 text-gray-500" />
                    <span className="line-clamp-1">{event.organizer}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                    <CalendarIcon className="w-4 h-4 text-gray-500" />
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
                                    ? 'bg-gray-800 text-white hover:bg-gray-700'
                                    : 'bg-gray-900 text-white hover:bg-gray-800'
                            }`}
                    >
                        {isTracked ? (
                            <>
                                <BookmarkSimpleIcon className="w-4 h-4" />
                                <span>Tracked</span>
                            </>
                        ) : (
                            <>
                                <BookmarkIcon className="w-4 h-4" />
                                <span>Track</span>
                            </>
                        )}
                    </button>
                    <button
                        onClick={handleShare}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                        title="Share event"
                    >
                        <ShareNetworkIcon className="w-4 h-4" />
                    </button>
                    {event.sourceUrl && (
                        <button
                            onClick={() => window.open(event.sourceUrl, '_blank')}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                            title="View event details"
                        >
                            <ArrowSquareOutIcon className="w-4 h-4" />
                        </button>
                    )}
                    {event.livestreamUrl && (
                        <button
                            onClick={() => window.open(event.livestreamUrl!, '_blank')}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                            title="Join live stream"
                        >
                            <PlayCircleIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EventPreviewCard;