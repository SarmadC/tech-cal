'use client';

import React from 'react';
import { Event } from '@/types';
import { MapPin, Clock, BookmarkSimple } from '@phosphor-icons/react';
import Image from 'next/image';
import { format } from 'date-fns';
import { getEventFormat, isEventFree } from '@/utils/filterCountUtils';

interface DemoEventCardProps {
    event: Event;
    onClick?: () => void;
    onBookmark?: (event: Event) => Promise<void> | void;
    isBookmarked?: boolean;
}

/**
 * Demo-only event card that matches the specific "Nvidia GTC" dark theme reference.
 * Distinct from the main app EventCard to strictly follow the marketing visual usage.
 */
export default function DemoEventCard({
    event,
    onClick,
    onBookmark,
    isBookmarked = false,
}: DemoEventCardProps) {
    const startDate = new Date(event.startTime);
    const dateLabel = format(startDate, 'EEE, MMM d');
    const timeLabel = format(startDate, 'h:mm a');
    const isFree = isEventFree(event);

    const priceDisplay = isFree
        ? 'Free'
        : typeof event.priceMin === 'number'
            ? `$${event.priceMin}`
            : event.priceRange || 'Paid';

    const eventFormat = getEventFormat(event);
    const formatDisplay = eventFormat === 'virtual'
        ? 'Remote'
        : eventFormat === 'hybrid'
            ? 'Hybrid'
            : 'On-Site';

    const logoSources = React.useMemo(() => {
        const sources: string[] = [];
        if (event.eventImageUrl) sources.push(event.eventImageUrl);
        if (event.organization?.logo) sources.push(event.organization.logo);
        return sources;
    }, [event.eventImageUrl, event.organization?.logo]);

    const [activeLogoSrc, setActiveLogoSrc] = React.useState<string | null>(() => logoSources[0] ?? null);

    React.useEffect(() => {
        setActiveLogoSrc(logoSources[0] ?? null);
    }, [event.id, logoSources]);

    const handleLogoError = React.useCallback(() => {
        if (!activeLogoSrc) return;
        const currentIndex = logoSources.indexOf(activeLogoSrc);
        const nextSrc = currentIndex >= 0 ? logoSources[currentIndex + 1] : undefined;
        setActiveLogoSrc(nextSrc ?? null);
    }, [activeLogoSrc, logoSources]);

    const logoAltText =
        activeLogoSrc === event.organization?.logo
            ? `${event.organization?.name ?? 'Event organizer'} logo`
            : `${event.title} event image`;

    return (
        <div
            onClick={onClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick?.();
                }
            }}
            tabIndex={0}
            role="button"
            aria-label={`Event: ${event.title}`}
            className="group relative flex flex-col w-full min-h-[400px] rounded-2xl border border-border/70 dark:border-white/10 bg-card/95 dark:bg-[#161616] p-5 shadow-xl transition-all duration-300 hover:border-border dark:hover:border-white/20 hover:bg-card dark:hover:bg-[#1A1A1A] cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 focus:ring-offset-background"
        >
            {/* Header: Logo + Bookmark */}
            <div className="flex justify-between items-start">
                <div className="w-14 h-14 rounded-lg flex items-center justify-center overflow-hidden bg-muted/60 dark:bg-white p-2">
                    {activeLogoSrc ? (
                        <Image
                            src={activeLogoSrc}
                            alt={logoAltText}
                            width={44}
                            height={44}
                            className="w-full h-full object-contain"
                            onError={handleLogoError}
                        />
                    ) : (
                        <div className="text-lg font-bold text-foreground dark:text-gray-900">
                            {event.title.charAt(0)}
                        </div>
                    )}
                </div>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onBookmark?.(event);
                    }}
                    className={`transition-colors ${isBookmarked ? 'text-amber-400 hover:text-amber-300' : 'text-muted-foreground hover:text-foreground'}`}
                    aria-pressed={isBookmarked}
                    aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark event'}
                >
                    <BookmarkSimple
                        size={24}
                        weight={isBookmarked ? 'fill' : 'regular'}
                        color={isBookmarked ? '#facc15' : undefined}
                    />
                </button>
            </div>

            {/* Content Section */}
            <div className="flex flex-col flex-1 mt-6">
                {/* Title */}
                <h3 className="text-xl font-bold text-foreground mb-3 line-clamp-1" title={event.title}>
                    {event.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-muted-foreground mb-5 line-clamp-3 leading-relaxed">
                    {event.description || 'No description available for this event.'}
                </p>

                {/* Meta Info */}
                <div className="flex flex-col gap-3 text-sm text-muted-foreground mb-6">
                    <div className="flex items-center gap-2.5">
                        <Clock size={16} className="text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{dateLabel} · {timeLabel}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <MapPin size={16} className="text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{event.location || 'Location TBA'}</span>
                    </div>
                </div>

                {/* Tags/Badges */}
                <div className="flex flex-wrap gap-2 mb-6">
                    <span className="px-3 py-1 rounded-full bg-muted text-xs font-medium text-foreground/80 dark:bg-[#262626] dark:text-gray-300">
                        {formatDisplay}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-muted text-xs font-medium text-foreground/80 dark:bg-[#262626] dark:text-gray-300">
                        {priceDisplay}
                    </span>
                </div>

                {/* Action Buttons - Always at bottom */}
                <div className="flex gap-3 mt-auto pt-3">
                    <button
                        className="flex-1 py-2.5 px-4 rounded-full bg-transparent border border-border text-foreground text-sm font-semibold hover:bg-muted/70 dark:border-white/20 dark:text-white dark:hover:bg-white/5 transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            onClick?.();
                        }}
                    >
                        Details
                    </button>
                    <button
                        className="flex-1 py-2.5 px-4 rounded-full bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/10 dark:shadow-white/5"
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
        </div>
    );
}
