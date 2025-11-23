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
import { formatTime, formatDate, getTimeUntilEvent } from '@/utils/dateUtils';
// Career impact components removed - using inline implementation
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
    // State for expandable description
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

    // Trigger animation on mount and when visibility changes
    useEffect(() => {
        if (isVisible && !hasAnimated) {
            // Use requestAnimationFrame for smoother animation
            const timer = requestAnimationFrame(() => {
                setHasAnimated(true);
            });
            return () => cancelAnimationFrame(timer);
        } else if (!isVisible) {
            // Reset animation state when hiding
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
        const offset = 10; // Small offset from cursor

        let x = position.x + offset;
        let y = position.y + offset;

        // Prevent going off right edge
        if (x + cardWidth > window.innerWidth - padding) {
            x = position.x - cardWidth - offset;
        }

        // Prevent going off bottom edge
        if (y + cardHeight > window.innerHeight - padding) {
            y = position.y - cardHeight - offset;
        }

        // Ensure minimum padding from edges
        x = Math.max(padding, Math.min(x, window.innerWidth - cardWidth - padding));
        y = Math.max(padding, Math.min(y, window.innerHeight - cardHeight - padding));

        return { x, y };
    }, [position.x, position.y]);

    const isVirtual = event.livestreamUrl || event.location?.toLowerCase().includes('virtual');

    // Helper functions
    const getUrgencyText = () => {
        const timeInfo = getTimeUntilEvent(event.startTime);
        if (timeInfo.isLive) return 'Live now';
        if (timeInfo.hasEnded) return 'Event ended';
        if (timeInfo.days > 0) return `Starts in ${timeInfo.days} day${timeInfo.days > 1 ? 's' : ''}`;
        if (timeInfo.hours > 0) return `Starts in ${timeInfo.hours} hour${timeInfo.hours > 1 ? 's' : ''}`;
        if (timeInfo.minutes > 0) return `Starts in ${timeInfo.minutes} minute${timeInfo.minutes > 1 ? 's' : ''}`;
        return 'Starting soon';
    };

    const getUrgencyColor = () => {
        const timeInfo = getTimeUntilEvent(event.startTime);
        if (timeInfo.isLive) return 'bg-red-500';
        if (timeInfo.hasEnded) return 'bg-gray-500';
        if (timeInfo.days === 0 && timeInfo.hours < 2) return 'bg-orange-500';
        return 'bg-blue-500';
    };

    const shouldShowReadMore = () => {
        return event.description && event.description.length > 150;
    };

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
                await trackEvent(trackingEventId, 'bookmarked');
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
            className={`event-preview-card event-preview-glass fixed z-[9999] w-80 rounded-lg shadow-xl overflow-hidden pointer-events-auto ${
                isPinned 
                    ? 'border-zinc-300/50 dark:border-zinc-400/30' 
                    : 'border-white/30 dark:border-white/10'
            } ${isVisible && hasAnimated ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
            style={{
                left: `${cardPosition.x}px`,
                top: `${cardPosition.y}px`,
                transformOrigin: 'top left',
                // Smoother animation with better easing
                transition: isVisible && hasAnimated 
                    ? 'opacity 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                    : 'opacity 0.15s cubic-bezier(0.4, 0, 1, 1), transform 0.15s cubic-bezier(0.4, 0, 1, 1)',
                pointerEvents: isVisible && hasAnimated ? 'auto' : 'none',
                // Prevent layout shifts
                willChange: 'opacity, transform',
            }}
            onMouseEnter={onHover}
            onMouseLeave={onLeave}
        >
            {/* Header */}
            <div className="event-preview-glass-header p-4 border-b border-white/20 dark:border-white/10">
                {/* Urgency indicator and tags on same line */}
                <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-1 flex-wrap">
                        <span className={`event-preview-urgency ${getUrgencyColor().replace('bg-', '').replace('-500', '')}`}>
                            {getUrgencyText()}
                        </span>
                        {(event.tags && event.tags.length > 0) || isPinned ? (
                            <div className="flex items-center flex-wrap gap-1.5">
                                {/* Show first 3 tags in preview */}
                                {event.tags && event.tags.length > 0 && (
                                    <>
                                        {event.tags.slice(0, 3).map((tag, index) => (
                                            <span
                                                key={index}
                                                className="px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 rounded-md bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm border border-white/20 dark:border-white/10"
                                            >
                                                {tag.name}
                                            </span>
                                        ))}
                                        {event.tags.length > 3 && (
                                            <span className="px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 rounded-md bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm border border-white/20 dark:border-white/10">
                                                +{event.tags.length - 3} more
                                            </span>
                                        )}
                                    </>
                                )}
                                {isPinned && (
                                    <span className="px-2.5 py-1 text-xs font-medium bg-white/60 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 rounded-md backdrop-blur-sm border border-white/20 dark:border-white/10 flex items-center gap-1.5">
                                        <BookmarkSimpleIcon className="w-3 h-3" />
                                        <span>Pinned</span>
                                    </span>
                                )}
                            </div>
                        ) : null}
                    </div>
                </div>

                {/* Career Impact Badge in Preview - moved to top right */}
                {(event as Event & { careerImpactLite?: CareerImpactScoreLite }).careerImpactLite && (
                    <div className="flex justify-end mb-2">
                        <div className="flex items-center gap-1 px-2 py-1 bg-white/60 dark:bg-gray-700/60 rounded-md backdrop-blur-sm border border-white/20 dark:border-white/10">
                            <div className={`
                                w-2 h-2 rounded-full
                                ${(event as Event & { careerImpactLite?: CareerImpactScoreLite }).careerImpactLite!.overall >= 80 ? 'bg-green-400' :
                                  (event as Event & { careerImpactLite?: CareerImpactScoreLite }).careerImpactLite!.overall >= 50 ? 'bg-blue-400' :
                                  (event as Event & { careerImpactLite?: CareerImpactScoreLite }).careerImpactLite!.overall >= 20 ? 'bg-yellow-400' : 'bg-gray-400'}
                            `} />
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                {Math.round((event as Event & { careerImpactLite?: CareerImpactScoreLite }).careerImpactLite!.overall)}%
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
                {/* Date */}
                <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                    <CalendarIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span>{formatDate(event.startTime, event.timezone)}</span>
                </div>

                {/* Time */}
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <ClockIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span>{formatTime(event.startTime, event.timezone)}</span>
                </div>

                {/* Organizer */}
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <UsersIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span className="line-clamp-1">{event.organizer}</span>
                </div>

                {/* Location with map context */}
                <div className="flex items-center justify-between gap-3 text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        {isVirtual ? (
                            <GlobeIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        ) : (
                            <MapPinIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        )}
                        <span className="line-clamp-1">
                            {isVirtual ? 'Virtual Event' : (event.location || 'Location TBA')}
                        </span>
                    </div>
                    {!isVirtual && event.location && (
                        <button
                            onClick={() => {
                                const mapsUrl = `https://maps.google.com/maps?q=${encodeURIComponent(event.location!)}`;
                                window.open(mapsUrl, '_blank');
                            }}
                            className="event-preview-map-link flex-shrink-0 px-2 py-1 rounded-md hover:bg-white/20 dark:hover:bg-white/10 transition-colors"
                        >
                            View Map
                        </button>
                    )}
                </div>

                {/* Expandable description - only show if not redundant (not just the title) */}
                {event.description && 
                 event.description.trim() !== event.title.trim() && 
                 !event.description.trim().startsWith(event.title.trim()) && (
                    <div className="pt-2">
                        <p className={`event-preview-description text-sm text-gray-600 dark:text-gray-300 leading-relaxed ${
                            isDescriptionExpanded ? 'expanded' : 'collapsed'
                        }`}>
                            {event.description}
                        </p>
                        {shouldShowReadMore() && (
                            <button
                                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                                className="event-preview-read-more"
                            >
                                {isDescriptionExpanded ? 'Show less' : 'Read more'}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-white/20 dark:border-white/10 bg-white/10 dark:bg-black/10 backdrop-blur-sm">
                <div className="flex gap-2">
                    <button
                        onClick={handleTrackEvent}
                        disabled={isLoading}
                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
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
                        className="px-3 py-2 border border-white/20 dark:border-white/10 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-white/10 transition-colors backdrop-blur-sm"
                        title="Share event"
                    >
                        <ShareNetworkIcon className="w-4 h-4" />
                    </button>
                    {event.sourceUrl && (
                        <button
                            onClick={() => { handleOutboundClick(); window.open(event.sourceUrl, '_blank'); }}
                            className="px-3 py-2 border border-white/20 dark:border-white/10 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-white/10 transition-colors backdrop-blur-sm"
                            title="View event details"
                        >
                            <ArrowSquareOutIcon className="w-4 h-4" />
                        </button>
                    )}
                    {event.livestreamUrl && (
                        <button
                            onClick={() => window.open(event.livestreamUrl!, '_blank')}
                            className="px-3 py-2 border border-white/20 dark:border-white/10 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-white/10 transition-colors backdrop-blur-sm"
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
