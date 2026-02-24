'use client';

import React from 'react';
import { Event, CareerImpactScore } from '@/types';
import { MapPin, BookmarkSimple, DotsThree, Star, UserCheck } from '@phosphor-icons/react';
import { format } from 'date-fns';
import Image from 'next/image';
import { getEventFormat, isEventFree } from '@/utils/filterCountUtils';
import { buildRecommendationHighlights } from './recommendationReasoning';
import { ProgressBar } from '@/components/dashboard/ProgressBar';
import { DiscoveryFeedbackAction } from './discoveryFeedback';

interface HeroEventCardProps {
    event: Event & { careerImpact?: CareerImpactScore };
    onClick?: () => void;
    onBookmark?: (event: Event) => Promise<void> | void;
    onAttendanceToggle?: (event: Event) => Promise<void> | void;
    onFeedbackAction?: (event: Event & { careerImpact?: CareerImpactScore }, action: DiscoveryFeedbackAction) => void;
    onShortlistToggle?: (event: Event & { careerImpact?: CareerImpactScore }) => void;
    isInShortlist?: boolean;
    isBookmarked?: boolean;
    isBookmarking?: boolean;
    isAttending?: boolean;
    isAttendanceUpdating?: boolean;
}

const CARD_ACCENTS = [
    'hover:border-sky-300/60 focus-visible:ring-sky-300/30',
    'hover:border-emerald-300/60 focus-visible:ring-emerald-300/30',
    'hover:border-violet-300/60 focus-visible:ring-violet-300/30',
    'hover:border-rose-300/60 focus-visible:ring-rose-300/30',
    'hover:border-amber-300/60 focus-visible:ring-amber-300/30',
    'hover:border-indigo-300/60 focus-visible:ring-indigo-300/30',
];

const HeroEventCard: React.FC<HeroEventCardProps> = ({
    event,
    onClick,
    onBookmark,
    onAttendanceToggle,
    onFeedbackAction,
    onShortlistToggle,
    isInShortlist = false,
    isBookmarked = false,
    isBookmarking = false,
    isAttending = false,
    isAttendanceUpdating = false
}) => {
    const colorIndex = event.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % CARD_ACCENTS.length;
    const accentClass = CARD_ACCENTS[colorIndex];

    const startDate = new Date(event.startTime);
    // Mockup format: "March 15, 2026"
    const dateLabel = format(startDate, 'MMMM d, yyyy');
    const isFree = isEventFree(event);

    const eventFormat = getEventFormat(event);
    const formatDisplay = eventFormat === 'virtual'
        ? 'Remote'
        : eventFormat === 'hybrid'
            ? 'Hybrid'
            : 'On-Site';



    const priceDisplay = isFree
        ? 'Free'
        : typeof event.priceMin === 'number'
            ? `$${event.priceMin}`
            : event.priceRange || 'Paid';
    const logoSources = React.useMemo(() => {
        const sources: string[] = [];
        if (event.eventImageUrl) sources.push(event.eventImageUrl);
        if (event.organization?.logo) sources.push(event.organization.logo);
        return sources;
    }, [event.eventImageUrl, event.organization]);

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

    const logoAltText = activeLogoSrc === event.organization?.logo
        ? `${event.organization?.name ?? 'Event organizer'} logo`
        : `${event.title} event image`;

    // Mouse tracking for spotlight effect
    const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 });
    const cardRef = React.useRef<HTMLDivElement>(null);
    const [isActionMenuOpen, setIsActionMenuOpen] = React.useState(false);
    const actionMenuRef = React.useRef<HTMLDivElement>(null);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        setMousePosition({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
    };

    React.useEffect(() => {
        if (!isActionMenuOpen) {
            return;
        }

        const handleOutsideClick = (eventTarget: MouseEvent) => {
            if (!actionMenuRef.current) {
                return;
            }

            const targetNode = eventTarget.target;
            if (targetNode instanceof Node && !actionMenuRef.current.contains(targetNode)) {
                setIsActionMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [isActionMenuOpen]);



    // Extract reasons for the right column
    const reasons = React.useMemo(() => {
        return buildRecommendationHighlights({
            careerImpact: event.careerImpact,
            event: { attendeeCount: event.attendeeCount ?? null },
            maxItems: 3,
        });
    }, [event.careerImpact, event.attendeeCount]);

    const recommendationScore = Math.round(
        Math.min(100, Math.max(0, event.careerImpact?.overall ?? 0))
    );

    return (
        <div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            className={`group relative overflow-hidden rounded-xl border border-border/60 bg-card p-5 text-foreground shadow-sm transition-all duration-300 cursor-pointer dark:bg-card/40 hover:border-border-strong hover:-translate-y-1 hover:shadow-md md:grid md:grid-cols-[1fr_350px] md:gap-6 md:items-start ${accentClass}`}
            onClick={onClick}
        >
            {/* Spotlight Gradient - Theme aware */}
            <div
                className="pointer-events-none absolute -inset-px opacity-0 transition duration-500 group-hover:opacity-100"
                style={{
                    background: `radial-gradient(800px circle at ${mousePosition.x}px ${mousePosition.y}px, var(--accent-primary-light), transparent 40%)`,
                }}
            />

            {/* Left Pane: Main Info */}
            <div className="flex flex-col relative z-10 h-full">
                {/* Header: Logo + Title */}
                <div className="flex items-start gap-4 mb-2">
                    {/* Logo - Dimmed by default, color on hover */}
                    <div className="h-11 w-11 shrink-0 rounded-lg bg-background border border-border/60 flex items-center justify-center overflow-hidden shadow-sm transition-all duration-500 group-hover:border-border group-hover:bg-background mt-1">
                        {activeLogoSrc ? (
                            <Image
                                src={activeLogoSrc}
                                alt={logoAltText}
                                width={44}
                                height={44}
                                className="w-full h-full object-contain p-1.5 opacity-90 grayscale transition-all duration-500 group-hover:opacity-100 group-hover:grayscale-0"
                                onError={handleLogoError}
                            />
                        ) : (
                            <div className="text-xl font-bold text-muted-foreground/50 group-hover:text-foreground/80 transition-colors">
                                {event.title.charAt(0)}
                            </div>
                        )}
                    </div>

                    <div className="min-w-0 flex flex-col pt-1">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-[16px] font-semibold text-foreground leading-tight tracking-tight group-hover:text-foreground transition-colors truncate pr-4">
                                {event.title}
                            </h3>
                        </div>
                        {/* Date/Time Sub-header - Matching EventCard */}
                        <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground/80">
                            <span>{dateLabel}</span>
                        </div>
                    </div>
                </div>

                {/* Description */}
                <p className="text-[13px] text-muted-foreground/90 mb-0 leading-relaxed line-clamp-6 pl-[60px] pr-4 font-normal">
                    {event.description || 'No description available for this event.'}
                </p>
            </div>

            {/* Right Pane: match details */}
            <div className="hidden md:flex flex-col relative z-10 h-full pt-1">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex-1 mr-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-muted-foreground font-sans">
                                {recommendationScore}% match
                            </span>
                        </div>
                        <ProgressBar
                            value={recommendationScore}
                            showPercentage={false}
                            height="h-1"
                            bgColor="bg-primary/20"
                            color="bg-primary"
                            className="space-y-0"
                        />
                    </div>
                    <div className="flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100" ref={actionMenuRef}>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onAttendanceToggle?.(event);
                            }}
                            className={`p-1.5 rounded-md transition-all duration-200 ${isAttending ? 'text-emerald-500 dark:text-emerald-400' : 'text-muted-foreground/75 hover:text-foreground hover:bg-accent/20'} ${isAttendanceUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                            aria-pressed={isAttending}
                            aria-label={isAttending ? 'Remove attending status' : 'Mark as attending'}
                            disabled={isAttendanceUpdating}
                            aria-busy={isAttendanceUpdating}
                        >
                            <UserCheck size={16} weight={isAttending ? 'fill' : 'regular'} />
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onBookmark?.(event);
                            }}
                            className={`p-1.5 rounded-md transition-all duration-200 ${isBookmarked ? 'text-amber-500 dark:text-amber-400' : 'text-muted-foreground/75 hover:text-foreground hover:bg-accent/20'} ${isBookmarking ? 'opacity-50 cursor-not-allowed' : ''}`}
                            aria-pressed={isBookmarked}
                            disabled={isBookmarking}
                        >
                            <BookmarkSimple size={16} weight={isBookmarked ? 'fill' : 'regular'} />
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onShortlistToggle?.(event);
                            }}
                            className={`p-1.5 rounded-md shrink-0 transition-all duration-200 ${isInShortlist ? 'text-violet-500 bg-violet-500/10 dark:text-violet-300 dark:bg-violet-500/15' : 'text-muted-foreground/75 hover:text-foreground hover:bg-accent/20'}`}
                            aria-pressed={isInShortlist}
                            aria-label={isInShortlist ? 'Remove from shortlist' : 'Add to shortlist'}
                        >
                            <Star size={16} weight={isInShortlist ? 'fill' : 'regular'} />
                        </button>

                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsActionMenuOpen((prev) => !prev);
                            }}
                            className="p-1.5 rounded-md text-muted-foreground/75 hover:text-foreground hover:bg-accent/20 transition-colors"
                            aria-haspopup="menu"
                            aria-expanded={isActionMenuOpen}
                        >
                            <DotsThree size={16} weight="bold" />
                        </button>

                        {isActionMenuOpen && (
                            <div
                                role="menu"
                                className="absolute right-0 top-8 z-40 w-44 rounded-lg border border-border bg-popover p-1.5 shadow-xl"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    type="button"
                                    className="w-full text-left rounded-md px-2.5 py-1.5 text-xs text-foreground/90 hover:bg-accent"
                                    onClick={() => {
                                        onFeedbackAction?.(event, 'less-like-this');
                                        setIsActionMenuOpen(false);
                                    }}
                                >
                                    Less like this
                                </button>
                                <button
                                    type="button"
                                    className="w-full text-left rounded-md px-2.5 py-1.5 text-xs text-foreground/90 hover:bg-accent"
                                    onClick={() => {
                                        onFeedbackAction?.(event, 'not-relevant');
                                        setIsActionMenuOpen(false);
                                    }}
                                >
                                    Not relevant
                                </button>
                                <button
                                    type="button"
                                    className="w-full text-left rounded-md px-2.5 py-1.5 text-xs text-rose-500 hover:bg-rose-500/10"
                                    onClick={() => {
                                        onFeedbackAction?.(event, 'hide');
                                        setIsActionMenuOpen(false);
                                    }}
                                >
                                    Hide event
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {reasons.length > 0 ? (
                    <div className="grid grid-cols-[120px_1fr] gap-x-2 gap-y-3 pl-0">
                        {reasons.map((reason, idx) => {
                            const parts = reason.split(': ');
                            const hasKey = parts.length > 1;
                            const label = hasKey ? parts[0] + ':' : null;
                            const value = hasKey ? parts.slice(1).join(': ') : reason;

                            return (
                                <React.Fragment key={idx}>
                                    <div className="text-[13px] text-muted-foreground leading-snug">
                                        {hasKey ? label : <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 inline-block align-middle" />}
                                    </div>
                                    <div className="text-[13px] font-medium text-foreground leading-snug">
                                        {value}
                                    </div>
                                </React.Fragment>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-[13px] text-muted-foreground/60 italic font-mono transition-opacity duration-300">
                        Recommended for you
                    </div>
                )}
            </div>

            {/* Footer: Spanning full width */}
            <div className="md:col-span-2 flex items-center justify-between pt-4 border-t border-border/25 mt-2">
                <div className="flex items-center gap-2 text-[11px] font-mono text-gray-500 dark:text-muted-foreground/60 min-w-0">
                    <MapPin size={12} weight="fill" className="text-gray-400 dark:text-muted-foreground/40 flex-shrink-0" />
                    <span className="truncate max-w-[140px]">{event.location || 'Location TBA'}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <span className="px-1.5 py-0.5 rounded-[4px] bg-blue-50 dark:bg-blue-500/20 text-[10px] font-mono text-blue-700 dark:text-blue-200 uppercase tracking-wider">
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
            {/* Mobile quick actions (Absolute top right) */}
            <div className="absolute top-4 right-4 md:hidden z-20 flex items-center gap-2">
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onAttendanceToggle?.(event);
                    }}
                    className={`p-2 rounded-full backdrop-blur-sm transition-all duration-200 ${isAttending ? 'text-emerald-500 bg-emerald-500/10 dark:text-emerald-400 dark:bg-emerald-400/10' : 'text-muted-foreground/60 bg-background/40'} ${isAttendanceUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                    aria-pressed={isAttending}
                    aria-label={isAttending ? 'Remove attending status' : 'Mark as attending'}
                    disabled={isAttendanceUpdating}
                    aria-busy={isAttendanceUpdating}
                >
                    <UserCheck size={18} weight={isAttending ? 'fill' : 'regular'} />
                </button>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onBookmark?.(event);
                    }}
                    className={`p-2 rounded-full backdrop-blur-sm transition-all duration-200 ${isBookmarked ? 'text-amber-500 bg-amber-500/10 dark:text-amber-400 dark:bg-amber-400/10' : 'text-muted-foreground/60 bg-background/40'}`}
                >
                    <BookmarkSimple size={18} weight={isBookmarked ? 'fill' : 'regular'} />
                </button>
            </div>
        </div>
    );
};

export default HeroEventCard;
