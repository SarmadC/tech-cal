'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import { formatDate } from '@/utils/dateUtils';
import { Badge } from '@/components/ui/badge';
import type { TrackedEvent, EventType } from '@/types';
import NetworkAttendingBadge from '@/components/social/NetworkAttendingBadge';
import { getVersionedImageSrc } from '@/utils/imageUrl';

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

    // Fallback chain for logo: event image -> org logo -> first letter
    const logoSources = useMemo(() => {
        const sources: string[] = [];
        const eventImageSrc = getVersionedImageSrc(event.eventImageUrl, event.updatedAt);
        if (eventImageSrc) sources.push(eventImageSrc);
        if (event.organization?.logo) sources.push(event.organization.logo);
        return sources;
    }, [event.eventImageUrl, event.organization, event.updatedAt]);

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

    // Hide organizer if it's "Unknown" or empty
    const showOrganizer = event.organizer && event.organizer.trim() !== '' && event.organizer.toLowerCase() !== 'unknown';

    // Format metadata: Date • Location splits handled in JSX for hierarchy
    const hasLocation = !!event.location;
    const networkAttendingCount = event.networkAttendingCount ?? 0;
    const networkSampleAvatars = event.networkSampleAvatars ?? [];

    return (
        <button
            type="button"
            onClick={onClick}
            className="w-full flex items-center px-4 py-3 border-b border-zinc-100 bg-transparent hover:bg-zinc-50 dark:border-white/6 dark:hover:bg-white/2 transition-colors active:bg-zinc-100 dark:active:bg-white/4 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
            aria-label={`View details for ${event.title}`}
        >
            {/* Icon/Logo - Left */}
            <div className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-muted/30 flex items-center justify-center border border-border/20 mr-3">
                {activeLogoSrc ? (
                    <Image
                        src={activeLogoSrc}
                        alt={`${event.title} logo`}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                        onError={handleLogoError}
                    />
                ) : (
                    <span className="text-sm font-semibold text-muted-foreground">
                        {event.title.charAt(0).toUpperCase()}
                    </span>
                )}
            </div>

            {/* Content - Middle */}
            <div className="flex-1 min-w-0 flex flex-col gap-0.5 mr-3 text-left" style={{ lineHeight: '1.3' }}>
                {/* Title */}
                <h3 className="text-[15px] font-semibold text-zinc-900 dark:text-white line-clamp-1 text-left" style={{ lineHeight: '1.3' }}>
                    {event.title}
                </h3>

                {/* Organizer - Only show if not Unknown */}
                {showOrganizer && (
                    <p className="text-[13px] text-[#A1A1AA] line-clamp-1 text-left">
                        {event.organizer}
                    </p>
                )}

                {/* Metadata Row: Date • Location */}
                {/* Metadata Row: Date • Location hierarchy */}
                <div className="flex items-center gap-1.5 text-[13px] line-clamp-1 text-left overflow-hidden">
                    <span className="text-zinc-500 dark:text-zinc-300 font-medium shrink-0">{dateDisplay}</span>
                    {hasLocation && (
                        <>
                            <span className="text-zinc-400 dark:text-zinc-600 shrink-0">•</span>
                            <span className="text-zinc-500 truncate">{event.location}</span>
                        </>
                    )}
                </div>

                {networkAttendingCount > 0 && (
                    <NetworkAttendingBadge
                        eventId={event.id}
                        telemetrySurface="events_list_mobile_card"
                        count={networkAttendingCount}
                        sampleAvatars={networkSampleAvatars}
                        compact
                        className="mt-1.5 w-fit"
                    />
                )}
            </div>

            {/* Right Side: Category Badge + Chevron */}
            <div className="flex-shrink-0 flex items-center gap-2">
                {category && (
                    <Badge
                        style={{
                            backgroundColor: category.color ? `${category.color}1A` : undefined, // 10% opacity
                            // Text color handled by className for better contrast in light mode
                            borderColor: category.color ? `${category.color}33` : undefined,
                        }}
                        className={!category.color
                            ? "rounded-full text-[11px] font-medium px-2 py-0.5 whitespace-nowrap bg-zinc-100 text-slate-500 dark:bg-white/6 dark:text-[#D4D4D8] border-none"
                            : "rounded-full text-[11px] font-medium px-2 py-0.5 whitespace-nowrap text-slate-500 dark:text-[#D4D4D8] border dark:border-none"}
                    >
                        {category.name}
                    </Badge>
                )}
                <span className="text-[#71717A] text-lg">›</span>
            </div>
        </button>
    );
}
