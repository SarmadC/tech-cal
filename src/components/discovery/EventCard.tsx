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
            className={`rounded-xl p-6 transition-all duration-300 cursor-pointer group relative border border-[#262626] bg-[#1A1A1A] hover:bg-[#1F1F1F] hover:-translate-y-1 text-[#E5E5E5] shadow-[0_2px_8px_rgba(0,0,0,0.12),0_0_2px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_16px_rgba(0,0,0,0.12),0_2px_4px_rgba(0,0,0,0.08)] focus-visible:ring-2 focus-visible:ring-offset-0 ${accentClass}`}
            onClick={onClick}
        >
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-md bg-white border border-border/20 flex items-center justify-center overflow-hidden shadow-sm">
                        {activeLogoSrc ? (
                            <Image
                                src={activeLogoSrc}
                                alt={logoAltText}
                                width={48}
                                height={48}
                                className="w-full h-full object-contain"
                                onError={handleLogoError}
                            />
                        ) : (
                            <div className="text-xl font-bold text-gray-400">
                                {event.title.charAt(0)}
                            </div>
                        )}
                    </div>
                </div>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onBookmark?.(event);
                    }}
                    className={`transition-colors ${isBookmarked ? 'text-amber-400 hover:text-amber-300' : 'text-muted-foreground hover:text-foreground'} ${isBookmarking ? 'opacity-50 cursor-not-allowed' : ''}`}
                    aria-pressed={isBookmarked}
                    aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark event'}
                    disabled={isBookmarking}
                    aria-busy={isBookmarking}
                >
                    <BookmarkSimple size={24} weight={isBookmarked ? 'fill' : 'regular'} />
                </button>
            </div>

            <h3 className="text-xl font-medium text-[#E5E5E5] mb-2 leading-7 tracking-tight" title={event.title}>
                {event.title}
            </h3>

            <p className="text-sm text-[#A3A3A3] mb-4 line-clamp-3 leading-6">
                {event.description || 'No description available for this event.'}
            </p>

            <div className="space-y-2 text-sm text-[#999999] mb-4 font-normal leading-5">
                <div className="flex items-center gap-2">
                    <Clock size={16} className="text-[#8A8A8A]" />
                    <span>{dateLabel} · {timeLabel}</span>
                </div>
                <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-[#8A8A8A]" />
                    <span className="truncate">{event.location || 'Location TBA'}</span>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
                <span className="px-3 py-1 rounded-[6px] bg-[#262626] text-xs font-medium text-[#D4D4D4] border border-[#333333] tracking-wide">
                    {formatDisplay}
                </span>
                <span className="px-3 py-1 rounded-[6px] bg-[#262626] text-xs font-medium text-[#D4D4D4] border border-[#333333] tracking-wide">
                    {priceDisplay}
                </span>
            </div>

            <div className="flex gap-3 mt-auto">
                <button
                    className="flex-1 py-2.5 px-4 rounded-full bg-[#2A2A2A] text-foreground text-sm font-medium hover:bg-[#333333] transition-colors border border-transparent"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClick?.();
                    }}
                >
                    Details
                </button>
                <button
                    className="flex-1 py-2.5 px-4 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all shadow-[0_1px_3px_rgba(0,0,0,0.1)] hover:shadow-[0_2px_6px_rgba(0,0,0,0.15)]"
                    onClick={(e) => {
                        e.stopPropagation();
                        const targetUrl = event.registrationUrl || event.sourceUrl;
                        if (targetUrl) {
                            window.open(targetUrl, '_blank');
                        }
                    }}
                >
                    Register
                </button>
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
