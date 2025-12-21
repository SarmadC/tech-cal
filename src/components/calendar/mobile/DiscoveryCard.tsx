'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
    Calendar,
    MapPin,
    Users,
    Clock,
    BookmarkSimple
} from '@phosphor-icons/react';
import { Event, CareerImpactScore } from '@/types';
import { CareerImpactScoreLite } from '@/types/careerImpact';
import { cn } from '@/lib/utils';
import ShinyText from '../shared/ShinyText';
import '../shared/ShinyText.css';
import { formatDate, formatTime } from '@/utils/dateUtils';
import { useEventEngagement } from '@/hooks/useEventEngagement';
import { getEventFormat, isEventFree } from '@/utils/filterCountUtils';

export interface DiscoveryCardProps {
    event: Event & { careerImpactLite?: CareerImpactScoreLite; careerImpact?: CareerImpactScore };
    onClick?: () => void;
    onView?: () => void;
    onDetailsClick?: () => void;
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
    onDetailsClick,
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

    // Card Colors & category logic
    const getCategoryColor = () => {
        if (event.category?.color) return event.category.color;
        // Fallbacks
        return '#f1f5f9';
    };
    const categoryColor = getCategoryColor();

    const displayScore = React.useMemo(() => {
        const v = event.careerImpact?.overall ?? event.careerImpactLite?.overall ?? 0;
        return Math.min(100, Math.max(0, v <= 1 ? v * 100 : v));
    }, [event]);

    // Format price
    const isFree = isEventFree(event);
    const priceDisplay = isFree
        ? 'Free'
        : typeof event.priceMin === 'number'
            ? `$${event.priceMin}`
            : event.priceRange || 'Paid';

    // Format format (Virtual/In-Person)
    const eventFormat = getEventFormat(event);
    const formatDisplay = eventFormat === 'virtual'
        ? 'Remote'
        : eventFormat === 'hybrid'
            ? 'Hybrid'
            : 'On-Site';

    return (
        <div
            onClick={onClick}
            role="listitem"
            className={cn(
                "w-full mb-4 active:scale-[0.98] transition-transform duration-200",
                className
            )}
        >
            {/* Standard Glass Card Structure (matching original aesthetics) */}
            <div className="glass-card rounded-[24px] p-5 relative overflow-hidden bg-card/80 dark:bg-[#212023] border border-border/60 backdrop-blur shadow-sm">

                {/* Header Row: Logo | Title | Bookmark */}
                <div className="flex items-start gap-4 mb-3">
                    {/* Logo Box - Prominent Top Left */}
                    <div className="flex-shrink-0 relative">
                        <div className="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center bg-muted/30 border border-border/20 shadow-inner p-2">
                            {(() => {
                                const logoSizes = 40;
                                // Prioritize organization logo for the "logo box" feel, or event image if no logo
                                const imageSrc = event.organization?.logo || event.eventImageUrl;

                                if (imageSrc) {
                                    return (
                                        <Image
                                            src={imageSrc}
                                            alt={event.title}
                                            width={56}
                                            height={56}
                                            className="w-full h-full object-contain"
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                                // Fallback color handled by parent bg
                                                const parent = e.currentTarget.parentElement;
                                                if (parent) parent.style.backgroundColor = categoryColor;
                                            }}
                                        />
                                    );
                                } else {
                                    return (
                                        <div
                                            className="w-full h-full flex items-center justify-center font-bold text-lg text-foreground/50"
                                            style={{ backgroundColor: categoryColor }}
                                        >
                                            {event.title.charAt(0)}
                                        </div>
                                    );
                                }
                            })()}
                        </div>
                    </div>

                    {/* Title & Organization */}
                    <div className="flex-1 min-w-0 pt-0.5">
                        <h3 className="text-[17px] font-bold text-foreground leading-snug mb-1 line-clamp-2">
                            {event.title}
                        </h3>
                        {/* Match score badge inline or below title if meaningful */}
                        {showCareerImpact && displayScore > 0 && (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/50 border border-border/10">
                                <div className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    displayScore >= 80 ? "bg-emerald-500" :
                                        displayScore >= 60 ? "bg-blue-500" :
                                            "bg-amber-500"
                                )} />
                                <span className="text-[10px] font-medium text-muted-foreground">{Math.round(displayScore)}% Match</span>
                            </div>
                        )}
                    </div>

                    {/* Bookmark - Absolute top right or flex */}
                    <button
                        onClick={handleBookmark}
                        className="flex-shrink-0 -mr-2 -mt-2 p-3 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <BookmarkSimple weight={isBookmarkedValue ? 'fill' : 'bold'} className={isBookmarkedValue ? 'text-green-500 dark:text-[#fdfdfd]' : 'text-muted-foreground'} size={22} />
                    </button>
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
                    {event.description || "No description available."}
                </p>

                {/* Metadata Grid */}
                <div className="space-y-2 mb-5">
                    <div className="flex items-center gap-2 text-sm text-foreground/80">
                        <Clock size={16} className="text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{formatDate(event.startTime, event.timezone)} · {formatTime(event.startTime, event.timezone)}</span>
                    </div>
                    {event.location && (
                        <div className="flex items-center gap-2 text-sm text-foreground/80">
                            <MapPin size={16} className="text-muted-foreground flex-shrink-0" />
                            <span className="truncate">{event.location}</span>
                        </div>
                    )}
                </div>

                {/* Tags Row */}
                <div className="flex flex-wrap gap-2 mb-5">
                    <span className="px-3 py-1 rounded-full bg-muted/50 border border-border/40 text-xs font-medium text-foreground">
                        {formatDisplay}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-muted/50 border border-border/40 text-xs font-medium text-foreground">
                        {priceDisplay}
                    </span>
                    {badges}
                </div>

                {/* Actions - Split Buttons */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDetailsClick?.();
                        }}
                        className="flex items-center justify-center py-3 rounded-xl border border-input bg-background/50 text-foreground font-semibold text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                        Details
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            const url = event.registrationUrl || event.sourceUrl;
                            if (url) window.open(url, '_blank');
                        }}
                        className="flex items-center justify-center py-3 rounded-xl bg-black text-white font-semibold text-sm hover:bg-black/90 dark:bg-[#fdfdfd] dark:text-gray-900 dark:hover:bg-[#fdfdfd]/90 transition-colors shadow-md shadow-black/10 dark:shadow-[#fdfdfd]/10"
                    >
                        Register
                    </button>
                </div>
            </div>
        </div>
    );
});

DiscoveryCard.displayName = 'DiscoveryCard';

export default DiscoveryCard;

