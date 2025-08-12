// src/components/calendar/EventPreviewCard.tsx - FIXED with Dynamic Content
import { FC, useState, useRef, useEffect } from 'react';
import {
    Clock,
    MapPin,
    Users,
    ExternalLink,
    Bookmark,
    BookmarkCheck,
    Share2,
    Play,
    DollarSign,
    Star
} from 'lucide-react';
import { AppEvent, EventStatus } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useEventTracking } from '@/hooks/useEventTracking';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface EventPreviewCardProps {
    event: AppEvent;
    isVisible: boolean;
    position: { x: number; y: number };
    onClose: () => void;
    onTrackingChange?: (isTracked: boolean) => void;
}

const EventPreviewCard: FC<EventPreviewCardProps> = ({
    event,
    isVisible,
    position,
    onClose,
    onTrackingChange
}) => {
    const { user } = useAuth();
    const { trackEvent, untrackEvent } = useEventTracking();
    const [isTracked, setIsTracked] = useState(event.isTracked || false);
    const cardRef = useRef<HTMLDivElement>(null);

    // FIXED: Use real event data instead of mock data
    const getEventFormat = () => {
        if (event.livestreamUrl) return 'virtual';
        if (event.location?.toLowerCase().includes('virtual')) return 'virtual';
        if (event.location?.toLowerCase().includes('online')) return 'virtual';
        return 'in-person';
    };

    const getDifficulty = () => {
        const title = event.title.toLowerCase();
        const description = event.description.toLowerCase();

        if (title.includes('beginner') || title.includes('intro') || title.includes('101')) {
            return 'Beginner';
        }
        if (title.includes('advanced') || title.includes('expert') || description.includes('prerequisite')) {
            return 'Advanced';
        }
        return 'Intermediate';
    };

    const getCostInfo = () => {
        const title = event.title.toLowerCase();
        const description = event.description.toLowerCase();

        if (title.includes('free') || description.includes('free')) {
            return { type: 'free' as const };
        }
        return { type: 'unknown' as const };
    };

    const getEventTags = () => {
        const tags = [];
        const eventType = event.category?.name;

        if (eventType) tags.push(eventType);

        // Extract potential tags from title and description
        const content = `${event.title} ${event.description}`.toLowerCase();

        if (content.includes('ai') || content.includes('artificial intelligence')) tags.push('AI');
        if (content.includes('machine learning') || content.includes('ml')) tags.push('Machine Learning');
        if (content.includes('blockchain')) tags.push('Blockchain');
        if (content.includes('cloud')) tags.push('Cloud');
        if (content.includes('devops')) tags.push('DevOps');
        if (content.includes('frontend') || content.includes('react') || content.includes('vue')) tags.push('Frontend');
        if (content.includes('backend') || content.includes('api')) tags.push('Backend');
        if (content.includes('mobile')) tags.push('Mobile');
        if (content.includes('data')) tags.push('Data Science');
        if (content.includes('security')) tags.push('Security');

        return [...new Set(tags)]; // Remove duplicates
    };

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
        const cardWidth = 400;
        const cardHeight = 500;
        const padding = 20;

        let x = position.x;
        let y = position.y;

        // Adjust horizontal position
        if (x + cardWidth > window.innerWidth - padding) {
            x = window.innerWidth - cardWidth - padding;
        }

        // Adjust vertical position
        if (y + cardHeight > window.innerHeight - padding) {
            y = window.innerHeight - cardHeight - padding;
        }

        return { x: Math.max(padding, x), y: Math.max(padding, y) };
    };

    const cardPosition = getCardPosition();

    const handleTrackEvent = () => {
        if (!user) {
            toast.error('Please sign in to track events');
            return;
        }

        if (isTracked) {
            untrackEvent({ eventId: event.id });
            setIsTracked(false);
            toast.success('Event removed from your calendar');
            onTrackingChange?.(false);
        } else {
            trackEvent({
                eventId: event.id,
                status: 'bookmarked' as EventStatus,
                notes: ""
            });
            setIsTracked(true);
            toast.success('Event added to your calendar');
            onTrackingChange?.(true);
        }
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: event.title,
                    text: `Check out this tech event: ${event.title}`,
                    url: event.sourceUrl || window.location.href
                });
            } catch (_error) {
                // User cancelled or error occurred
            }
        } else {
            // Fallback to clipboard
            await navigator.clipboard.writeText(event.sourceUrl || window.location.href);
            toast.success('Event link copied to clipboard');
        }
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric'
        });
    };

    const isEventLive = () => {
        const now = new Date();
        const start = new Date(event.startTime);
        const end = event.endTime ? new Date(event.endTime) : null;
        return now >= start && (!end || now <= end);
    };

    const eventFormat = getEventFormat();
    const difficulty = getDifficulty();
    const costInfo = getCostInfo();
    const tags = getEventTags();

    if (!isVisible) return null;

    return (
        <div
            ref={cardRef}
            className="fixed z-50 w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl p-0 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200"
            style={{
                left: `${cardPosition.x}px`,
                top: `${cardPosition.y}px`,
            }}
        >
            {/* Header */}
            <div className="relative p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600">
                <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                        <Badge
                            variant="secondary"
                            className="bg-blue-500 text-white"
                        >
                            {event.category?.name || 'Event'}
                        </Badge>
                        {isEventLive() && (
                            <Badge variant="outline" className="border-red-400 text-red-600">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-1" />
                                Live
                            </Badge>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors text-lg"
                    >
                        ×
                    </button>
                </div>

                <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-1 line-clamp-2">
                    {event.title}
                </h3>

                <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{formatDate(event.startTime)} • {formatTime(event.startTime)}</span>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                {/* Quick Info Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center space-x-2 text-sm">
                        <MapPin className="w-4 h-4 text-gray-500" />
                        <div>
                            <div className="text-gray-900 dark:text-white font-medium">{eventFormat}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                                {event.location || 'Location TBA'}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2 text-sm">
                        <Star className="w-4 h-4 text-gray-500" />
                        <div>
                            <div className="text-gray-900 dark:text-white font-medium">{difficulty}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Level</div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2 text-sm">
                        <Users className="w-4 h-4 text-gray-500" />
                        <div>
                            <div className="text-gray-900 dark:text-white font-medium">{event.organizer}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Organizer</div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2 text-sm">
                        <DollarSign className="w-4 h-4 text-gray-500" />
                        <div>
                            <div className="text-gray-900 dark:text-white font-medium">
                                {costInfo.type === 'free' ? 'Free' : 'Check Website'}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Registration</div>
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-4">
                        {event.description || 'No description available for this event.'}
                    </p>
                </div>

                {/* Tags */}
                {tags.length > 0 && (
                    <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Topics</h4>
                        <div className="flex flex-wrap gap-1">
                            {tags.slice(0, 5).map((tag, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                    {tag}
                                </Badge>
                            ))}
                            {tags.length > 5 && (
                                <Badge variant="outline" className="text-xs">
                                    +{tags.length - 5} more
                                </Badge>
                            )}
                        </div>
                    </div>
                )}

                {/* Time Info */}
                <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Event Details</h4>
                    <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                        <div>Duration: {event.endTime ?
                            `${Math.round((new Date(event.endTime).getTime() - new Date(event.startTime).getTime()) / (1000 * 60 * 60))} hours`
                            : 'Duration not specified'
                        }</div>
                        {event.livestreamUrl && (
                            <div className="flex items-center space-x-1">
                                <Play className="w-3 h-3" />
                                <span>Live stream available</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
                <div className="flex space-x-2">
                    <Button
                        onClick={handleTrackEvent}
                        className={`flex-1 ${isTracked
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                        size="sm"
                    >
                        {isTracked ? (
                            <>
                                <BookmarkCheck className="w-4 h-4 mr-2" />
                                Tracked
                            </>
                        ) : (
                            <>
                                <Bookmark className="w-4 h-4 mr-2" />
                                Track Event
                            </>
                        )}
                    </Button>

                    <Button
                        onClick={handleShare}
                        variant="outline"
                        size="sm"
                        className="px-3"
                    >
                        <Share2 className="w-4 h-4" />
                    </Button>

                    {event.sourceUrl && (
                        <Button
                            onClick={() => window.open(event.sourceUrl, '_blank')}
                            variant="outline"
                            size="sm"
                            className="px-3"
                        >
                            <ExternalLink className="w-4 h-4" />
                        </Button>
                    )}

                    {event.livestreamUrl && (
                        <Button
                            onClick={() => window.open(event.livestreamUrl!, '_blank')}
                            variant="outline"
                            size="sm"
                            className="px-3"
                        >
                            <Play className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EventPreviewCard;