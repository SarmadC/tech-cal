'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
    MapPin,
    Clock,
    BookmarkSimple,
    Calendar
} from '@phosphor-icons/react';
import { Event, CareerImpactScore } from '@/types';
import { CareerImpactScoreLite } from '@/types/careerImpact';
import { cn } from '@/lib/utils';
import { formatDate, formatTime } from '@/utils/dateUtils';
import { useEventEngagement } from '@/hooks/useEventEngagement';
import { getEventFormat, isEventFree } from '@/utils/filterCountUtils';
import { getImpactBucketLabel } from '@/config/recommendationThresholds';

export interface DiscoveryCardProps {
    event: Event & { careerImpactLite?: CareerImpactScoreLite; careerImpact?: CareerImpactScore };
    onClick?: () => void;
    onView?: () => void;
    onLearnMore?: () => void;
    className?: string;
    variant?: 'default' | 'featured' | 'compact';
    showCareerImpact?: boolean;
    showLearnMore?: boolean;
    badges?: React.ReactNode;
}

const DiscoveryCard = React.memo<DiscoveryCardProps>(({
    event,
    onClick,
    onView,
    onLearnMore,
    className = '',
    variant = 'default',
    showCareerImpact = true,
    showLearnMore = false,
    badges
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const hasTrackedView = React.useRef(false);
    const { isBookmarked, toggleBookmark } = useEventEngagement();
    const isBookmarkedValue = isBookmarked(event.id);
    const [isBookmarking, setIsBookmarking] = useState(false);

    // Track view only once when component mounts
    React.useEffect(() => {
        if (!hasTrackedView.current && onView) {
            onView();
            hasTrackedView.current = true;
        }
    }, []);

    const formatEventDate = (dateString: string, timezone?: string | null) => {
        const date = new Date(dateString);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const eventDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const diffDays = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Tomorrow';

        const formatted = formatDate(dateString, timezone);
        const parts = formatted.split(',');
        if (date.getFullYear() !== now.getFullYear()) {
            return formatted;
        }
        return parts[0];
    };

    const handleBookmark = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isBookmarking) return;
        setIsBookmarking(true);
        try {
            await toggleBookmark(event.id, event as any);
        } finally {
            setIsBookmarking(false);
        }
    };

    const displayScore = React.useMemo(() => {
        const v = event.careerImpact?.overall ?? event.careerImpactLite?.overall ?? 0;
        return Math.min(100, Math.max(0, v <= 1 ? v * 100 : v));
    }, [event]);

    // Get color scheme based on score
    const scoreColors = React.useMemo(() => {
        return getImpactBucketLabel(displayScore);
    }, [displayScore]);

    // Format helpers
    const isFree = isEventFree(event);
    const eventFormat = getEventFormat(event);

    return (
        <div
            onClick={onClick}
            role="listitem"
            className={cn(
                "w-full mb-4 active:scale-[0.98] transition-transform duration-200",
                className
            )}
        >
            <div className="rounded-[12px] p-4 relative overflow-hidden bg-transparent border border-[var(--border-default)] active:bg-[var(--background-elevated)] transition-colors group">

                {/* Header Row: Avatar + Title + Bookmark */}
                <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg overflow-hidden bg-[var(--background-tertiary)] border border-[var(--border-default)] flex items-center justify-center">
                        {(() => {
                            const imageSrc = event.organization?.logo || event.eventImageUrl;
                            if (imageSrc) {
                                return (
                                    <Image
                                        src={imageSrc}
                                        alt={event.title}
                                        width={32}
                                        height={32}
                                        className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all"
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                            const parent = e.currentTarget.parentElement;
                                            if (parent) parent.style.backgroundColor = '#27272A';
                                        }}
                                    />
                                );
                            } else {
                                return (
                                    <div
                                        className="w-full h-full flex items-center justify-center font-bold text-xs text-[var(--foreground-muted)]"
                                        style={{ backgroundColor: 'var(--background-elevated)' }}
                                    >
                                        {event.title.charAt(0)}
                                    </div>
                                );
                            }
                        })()}
                    </div>

                    {/* Title */}
                    <div className="flex-1 min-w-0 pt-0.5">
                        <h3 className="text-[16px] font-semibold text-[var(--foreground-primary)] leading-snug line-clamp-2">
                            {event.title}
                        </h3>
                    </div>

                    {/* Bookmark */}
                    <button
                        onClick={handleBookmark}
                        className="flex-shrink-0 -mt-1 -mr-2 p-2 text-[var(--foreground-tertiary)] hover:text-[var(--foreground-primary)] transition-colors"
                    >
                        <BookmarkSimple weight={isBookmarkedValue ? 'fill' : 'bold'} className={isBookmarkedValue ? 'text-[var(--foreground-primary)]' : 'text-[var(--foreground-tertiary)]'} size={18} />
                    </button>
                </div>

                {/* Description */}
                <p className="mt-2 text-[13px] text-[var(--foreground-secondary)] leading-relaxed line-clamp-2 font-normal">
                    {event.description || "No description available."}
                </p>

                {/* Meta Row: Date & Location Inline */}
                <div className="mt-3 flex items-center gap-3 text-[12px] text-[var(--foreground-tertiary)] font-mono whitespace-nowrap overflow-hidden">
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Calendar size={14} weight="regular" className="text-[var(--foreground-muted)]" />
                        <span>{formatDate(event.startTime, event.timezone)}</span>
                    </div>
                    {event.location && (
                        <>
                            <span className="text-[var(--border-strong)]">•</span>
                            <div className="flex items-center gap-1.5 min-w-0">
                                <MapPin size={14} weight="regular" className="text-[var(--foreground-muted)] flex-shrink-0" />
                                <span className="truncate">{event.location}</span>
                            </div>
                        </>
                    )}
                </div>

                {/* Signals Row */}
                <div className="mt-3 flex items-center gap-2">
                    {/* Match Score */}
                    {showCareerImpact && displayScore > 0 && (
                        <div className={cn("flex items-center gap-1.5 px-1.5 py-0.5 rounded", scoreColors.bgColor, scoreColors.borderColor, "border")}>
                            <span className={cn("text-[11px] font-medium", scoreColors.color)}>
                                {Math.round(displayScore)}%
                            </span>
                        </div>
                    )}

                    {/* Format Pill */}
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[var(--background-tertiary)] border border-[var(--border-subtle)]">
                        <div className={cn("w-1 h-1 rounded-full",
                            eventFormat === 'virtual' ? 'bg-blue-500' :
                                eventFormat === 'hybrid' ? 'bg-purple-500' : 'bg-orange-500'
                        )} />
                        <span className="text-[11px] text-[var(--foreground-secondary)]">
                            {eventFormat === 'virtual' ? 'Remote' : eventFormat === 'hybrid' ? 'Hybrid' : 'In-Person'}
                        </span>
                    </div>

                    {/* Cost Pill */}
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[var(--background-tertiary)] border border-[var(--border-subtle)]">
                        <div className={cn("w-1 h-1 rounded-full", isFree ? 'bg-green-500' : 'bg-[var(--foreground-primary)]')} />
                        <span className="text-[11px] text-[var(--foreground-secondary)]">
                            {isFree ? 'Free' : 'Paid'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
});

DiscoveryCard.displayName = 'DiscoveryCard';

export default DiscoveryCard;

