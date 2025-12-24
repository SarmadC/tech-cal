'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import { MapPin, Clock, Tag } from '@phosphor-icons/react';
import { formatDate, formatTime } from '@/utils/dateUtils';
import { Badge } from '@/components/ui/badge';
import type { TrackedEvent, EventType } from '@/types';

interface MobileEventListCardProps {
    event: TrackedEvent;
    category?: EventType;
    onClick: () => void;
}

/**
 * Touch-friendly event card for the mobile Event Listings view.
 * Displays key event info in a compact, tappable card format.
 */
export default function MobileEventListCard({ event, category, onClick }: MobileEventListCardProps) {
    const dateDisplay = formatDate(event.startTime, event.timezone);
    const timeDisplay = formatTime(event.startTime, event.timezone);

    // Fallback chain for logo: event image -> org logo -> first letter
    const logoSources = useMemo(() => {
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

    return (
        <button
            type="button"
            onClick={onClick}
            className="w-full text-left glass-card rounded-2xl p-4 border border-border/60 bg-card/80 dark:bg-card/20 shadow-md backdrop-blur transition-all duration-200 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
            aria-label={`View details for ${event.title}`}
        >
            <div className="flex gap-4">
                {/* Logo/Image */}
                <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-muted/50 flex items-center justify-center border border-border/30">
                    {activeLogoSrc ? (
                        <Image
                            src={activeLogoSrc}
                            alt={`${event.title} logo`}
                            width={56}
                            height={56}
                            className="w-full h-full object-cover"
                            onError={handleLogoError}
                        />
                    ) : (
                        <span className="text-xl font-bold text-muted-foreground">
                            {event.title.charAt(0).toUpperCase()}
                        </span>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1.5">
                    {/* Title */}
                    <h3 className="text-base font-semibold text-foreground-primary line-clamp-1">
                        {event.title}
                    </h3>

                    {/* Organizer */}
                    <p className="text-sm text-foreground-secondary line-clamp-1">
                        {event.organizer}
                    </p>

                    {/* Date & Time */}
                    <div className="flex items-center gap-1.5 text-xs text-foreground-tertiary">
                        <Clock size={14} className="flex-shrink-0" />
                        <span>{dateDisplay} · {timeDisplay}</span>
                    </div>

                    {/* Location */}
                    {event.location && (
                        <div className="flex items-center gap-1.5 text-xs text-foreground-tertiary">
                            <MapPin size={14} className="flex-shrink-0" />
                            <span className="line-clamp-1">{event.location}</span>
                        </div>
                    )}
                </div>

                {/* Category Badge (right side) */}
                {category && (
                    <div className="flex-shrink-0 self-start">
                        <Badge
                            style={{
                                backgroundColor: `${category.color ?? 'var(--accent-primary)'}20`,
                                color: category.color ?? 'var(--accent-primary)',
                            }}
                            className="rounded-full text-[10px] font-medium px-2 py-0.5 whitespace-nowrap"
                        >
                            <Tag size={10} className="mr-1" />
                            {category.name}
                        </Badge>
                    </div>
                )}
            </div>
        </button>
    );
}
