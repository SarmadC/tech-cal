// src/components/calendar/EventPreviewCard.tsx

import { FC, useRef, RefObject, useMemo, useState, useEffect } from 'react';
import {
    ClockIcon, MapPinIcon, UsersIcon, ArrowSquareOutIcon, BookmarkIcon, BookmarkSimpleIcon,
    ShareNetworkIcon, PlayCircleIcon, GlobeIcon, CalendarIcon
} from '@phosphor-icons/react';
import { useClickOutside } from '@/hooks/useEventListener';
// 1. UPDATE IMPORTS: Use the new types and the type guard.
import { Event, TrackedEvent, MultiDayEventInstance } from '@/types';
import { CareerImpactScoreLite } from '@/types/careerImpact';
import { useTrackedEventsUnified } from '@/hooks/useTrackedEventsUnified';
import { useRecommendationTracking } from '@/hooks/useRecommendationTracking';
import { useAuth } from '@/contexts/AuthContext';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { isEventLive, formatTime, formatDate, getEventDuration } from '@/utils/dateUtils';
import { CareerImpactBadge } from '@/components/ui/career-impact-badge';
import { createAnalyticsContext } from '@/utils/analyticsUtils';

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
    const { trackEvent, untrackEvent, isLoading, trackedEventIds } = useTrackedEventsUnified();
    const { trackClick } = useRecommendationTracking({ enableTracking: true });

    // Use originalEventId for multi-day event instances, otherwise use the regular id
    const trackingEventId = ('originalEventId' in event ? (event as MultiDayEventInstance).originalEventId : null) || event.id;
    
    // Check tracking status from the hook's trackedEventIds Set
    const isTracked = trackingEventId ? (trackedEventIds?.has(trackingEventId) ?? false) : false;
    const cardRef = useRef<HTMLDivElement>(null) as RefObject<HTMLDivElement>;
    
    // Track if this is the first render to enable smooth initial animation
    const [hasAnimated, setHasAnimated] = useState(false);

    // Trigger animation on mount and when visibility changes
    useEffect(() => {
        if (isVisible && !hasAnimated) {
            // Small delay to ensure the initial state is rendered before animating
            requestAnimationFrame(() => {
                setHasAnimated(true);
            });
        } else if (!isVisible) {
            setHasAnimated(false);
        }
    }, [isVisible, hasAnimated]);

    // Handle click outside to close
    useClickOutside(cardRef, () => onClose(), isVisible);

    // Memoize card position to avoid recalculating on every render
    const cardPosition = useMemo(() => {
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
    }, [position.x, position.y]);

    const isVirtual = event.livestreamUrl || event.location?.toLowerCase().includes('virtual');

    // Actions
    const handleTrackEvent = async () => {
        
        if (!user) {
            showError('Please sign in to track events');
            return;
        }
        
        try {
            if (isTracked) {
                await untrackEvent(trackingEventId);
                showSuccess('Event removed from your calendar');
            } else {
                await trackEvent(trackingEventId);
                showSuccess('Event added to your calendar');
            }
        } catch (error) {
            console.error('Error tracking event:', error);
            showError(isTracked ? 'Failed to add event. Please try again.' : 'Failed to remove event. Please try again.');
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

    const handleOutboundClick = () => {
        const context = createAnalyticsContext(event as unknown as Record<string, unknown>);
        trackClick(event.id, 'for_you', undefined, context);
    };

    // Keep component mounted to allow fade-out animation
    // Only unmount if there's no event at all
    if (!event) return null;

    return (
        <div
            ref={cardRef}
            className={`fixed z-[9999] w-80 bg-white dark:bg-gray-800 border rounded-lg shadow-xl overflow-hidden pointer-events-auto ${
                isPinned 
                    ? 'border-zinc-300 dark:border-zinc-400 shadow-zinc-200 dark:shadow-black/40' 
                    : 'border-gray-200 dark:border-gray-600'
            } ${isVisible && hasAnimated ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
            style={{
                left: `${cardPosition.x}px`,
                top: `${cardPosition.y}px`,
                transformOrigin: 'top center',
                // Smooth animation for opacity and scale with ease-out for natural feel
                transition: 'opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                pointerEvents: isVisible && hasAnimated ? 'auto' : 'none',
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
                            onClick={() => { handleOutboundClick(); window.open(event.sourceUrl, '_blank'); }}
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