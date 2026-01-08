'use client';

import React from 'react';
import { Event } from '@/types';
import { MapPin, Clock, BookmarkSimple } from '@phosphor-icons/react';
import { format } from 'date-fns';
import Image from 'next/image';
import { getEventFormat, isEventFree } from '@/utils/filterCountUtils';

interface EventCardProps {
    event: Event;
    onClick?: () => void;
    onBookmark?: (event: Event) => Promise<void> | void;
    isBookmarked?: boolean;
    isBookmarking?: boolean;
}

// Accent rings for cards - deterministic per-event to keep variety without hardcoded fills
const CARD_ACCENTS = [
    'hover:border-sky-300/60 focus-visible:ring-sky-300/30',
    'hover:border-emerald-300/60 focus-visible:ring-emerald-300/30',
    'hover:border-violet-300/60 focus-visible:ring-violet-300/30',
    'hover:border-rose-300/60 focus-visible:ring-rose-300/30',
    'hover:border-amber-300/60 focus-visible:ring-amber-300/30',
    'hover:border-indigo-300/60 focus-visible:ring-indigo-300/30',
];

// Memoize to prevent unnecessary re-renders when parent updates
// Only compare data props, not callbacks (callbacks change on every render due to inline functions)
const EventCard: React.FC<EventCardProps> = React.memo(({ event, onClick, onBookmark, isBookmarked = false, isBookmarking = false }) => {
    // Deterministic color based on event ID
    const colorIndex = event.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % CARD_ACCENTS.length;
    const accentClass = CARD_ACCENTS[colorIndex];

    const startDate = new Date(event.startTime);
    const dateLabel = format(startDate, 'EEE, MMM d');
    const timeLabel = format(startDate, 'h:mm a');
    const isFree = isEventFree(event);

    // Format price
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

    const logoSources = React.useMemo(() => {
        const sources: string[] = [];
        if (event.eventImageUrl) {
            sources.push(event.eventImageUrl);
        }
        if (event.organization?.logo) {
            sources.push(event.organization.logo);
        }
        return sources;
    }, [event.eventImageUrl, event.organization?.logo]);

    const [activeLogoSrc, setActiveLogoSrc] = React.useState<string | null>(() => logoSources[0] ?? null);

    React.useEffect(() => {
        setActiveLogoSrc(logoSources[0] ?? null);
    }, [event.id, logoSources]);

    const handleLogoError = React.useCallback(() => {
        if (!activeLogoSrc) {
            return;
        }
        const currentIndex = logoSources.indexOf(activeLogoSrc);
        const nextSrc = currentIndex >= 0 ? logoSources[currentIndex + 1] : undefined;
        setActiveLogoSrc(nextSrc ?? null);
    }, [activeLogoSrc, logoSources]);

    const logoAltText = activeLogoSrc === event.organization?.logo
        ? `${event.organization?.name ?? 'Event organizer'} logo`
        : `${event.title} event image`;

    return (
        <div
            className={`flex flex-col rounded-[6px] p-5 transition-all duration-200 cursor-pointer group relative border border-border dark:border-border bg-card dark:bg-[#0a0a0a] hover:shadow-md dark:hover:shadow-none hover:bg-accent/10 hover:border-border-strong text-foreground ${accentClass}`}
            onClick={onClick}
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[6px] bg-card border border-border flex items-center justify-center overflow-hidden shadow-sm">
                        {activeLogoSrc ? (
                            <Image
                                src={activeLogoSrc}
                                alt={logoAltText}
                                width={40}
                                height={40}
                                className="w-full h-full object-contain"
                                onError={handleLogoError}
                            />
                        ) : (
                            <div className="text-lg font-bold text-gray-400">
                                {event.title.charAt(0)}
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col">
                        <h3 className="text-[15px] font-medium text-foreground leading-tight group-hover:text-foreground transition-colors" title={event.title}>
                            {event.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-gray-500 dark:text-muted-foreground/60">
                            <span>{dateLabel}</span>
                            <span>·</span>
                            <span>{timeLabel}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onBookmark?.(event);
                        }}
                        className={`p-1.5 rounded-md transition-all duration-200 ${isBookmarked ? 'text-amber-400 hover:text-amber-300' : 'text-muted-foreground/40 hover:text-foreground hover:bg-accent/10'} ${isBookmarking ? 'opacity-50 cursor-not-allowed' : ''}`}
                        aria-pressed={isBookmarked}
                        aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark event'}
                        disabled={isBookmarking}
                        aria-busy={isBookmarking}
                    >
                        <BookmarkSimple
                            size={16}
                            weight={isBookmarked ? 'fill' : 'regular'}
                            className="transition-all duration-200"
                        />
                    </button>

                    <button
                        type="button"
                        className="p-1.5 text-muted-foreground/40 hover:text-foreground hover:bg-accent/10 rounded-md transition-all"
                        onClick={(e) => {
                            e.stopPropagation();
                            const targetUrl = event.registrationUrl || event.sourceUrl;
                            if (targetUrl) {
                                window.open(targetUrl, '_blank');
                            }
                        }}
                        title="Register"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 256 256"><path fill="currentColor" d="M200,64V168a8,8,0,0,1-16,0V83.31L69.66,197.66a8,8,0,0,1-11.32-11.32L172.69,72H88a8,8,0,0,1,0-16H192A8,8,0,0,1,200,64Z"></path></svg>
                    </button>
                </div>
            </div>

            <p className="text-[13px] text-muted-foreground/80 mb-4 line-clamp-2 leading-relaxed">
                {event.description || 'No description available for this event.'}
            </p>

            <div className="mt-auto flex items-center justify-between pt-3 border-t border-border/50">
                <div className="flex items-center gap-2 text-[11px] font-mono text-gray-500 dark:text-muted-foreground/60">
                    <MapPin size={12} weight="fill" className="text-gray-400 dark:text-muted-foreground/40" />
                    <span className="truncate max-w-[120px]">{event.location || 'Location TBA'}</span>
                </div>

                <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded-[4px] bg-blue-50 dark:bg-blue-500/10 text-[10px] font-mono text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                        {formatDisplay}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded-[4px] text-[10px] font-mono uppercase tracking-wider ${isFree
                            ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400'
                            : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-muted-foreground'
                        }`}>
                        {priceDisplay}
                    </span>
                </div>
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    // Custom comparison: only compare data that affects rendering
    // Skip onClick/onBookmark as they change every render (inline functions in parent)
    return (
        prevProps.event.id === nextProps.event.id &&
        prevProps.isBookmarked === nextProps.isBookmarked &&
        prevProps.isBookmarking === nextProps.isBookmarking
    );
});

EventCard.displayName = 'EventCard';

export default EventCard;
