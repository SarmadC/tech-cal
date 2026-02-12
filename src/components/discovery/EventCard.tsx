'use client';

import React from 'react';
import { Event, CareerImpactScore } from '@/types';
import { MapPin, BookmarkSimple, DotsThree, Star } from '@phosphor-icons/react';
import { format } from 'date-fns';
import Image from 'next/image';
import { getEventFormat, isEventFree } from '@/utils/filterCountUtils';
import RecommendationContext from './RecommendationContext';
import { QuickFitBadge } from './quickFitBadges';
import { DiscoveryFeedbackAction } from './discoveryFeedback';

interface EventCardProps {
    event: Event & { careerImpact?: CareerImpactScore };
    onClick?: () => void;
    onBookmark?: (event: Event) => Promise<void> | void;
    isBookmarked?: boolean;
    isBookmarking?: boolean;
    showRecommendationContext?: boolean;
    quickFitBadges?: QuickFitBadge[];
    onFeedbackAction?: (event: Event, action: DiscoveryFeedbackAction) => void;
    onExplainRecommendation?: (event: Event & { careerImpact?: CareerImpactScore }) => void;
    onShortlistToggle?: (event: Event & { careerImpact?: CareerImpactScore }) => void;
    isInShortlist?: boolean;
}

const CARD_ACCENTS = [
    'hover:border-sky-300/60 focus-visible:ring-sky-300/30',
    'hover:border-emerald-300/60 focus-visible:ring-emerald-300/30',
    'hover:border-violet-300/60 focus-visible:ring-violet-300/30',
    'hover:border-rose-300/60 focus-visible:ring-rose-300/30',
    'hover:border-amber-300/60 focus-visible:ring-amber-300/30',
    'hover:border-indigo-300/60 focus-visible:ring-indigo-300/30',
];

const EventCard: React.FC<EventCardProps> = React.memo(({
    event,
    onClick,
    onBookmark,
    isBookmarked = false,
    isBookmarking = false,
    showRecommendationContext = false,
    quickFitBadges = [],
    onFeedbackAction,
    onExplainRecommendation,
    onShortlistToggle,
    isInShortlist = false,
}) => {
    const colorIndex = event.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % CARD_ACCENTS.length;
    const accentClass = CARD_ACCENTS[colorIndex];

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
        if (event.eventImageUrl) {
            sources.push(event.eventImageUrl);
        }
        if (event.organization?.logo) {
            sources.push(event.organization.logo);
        }
        return sources;
    }, [event.eventImageUrl, event.organization]);

    const [activeLogoSrc, setActiveLogoSrc] = React.useState<string | null>(() => logoSources[0] ?? null);
    const [isActionMenuOpen, setIsActionMenuOpen] = React.useState(false);
    const actionMenuRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        setActiveLogoSrc(logoSources[0] ?? null);
    }, [event.id, logoSources]);

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

    const runFeedbackAction = React.useCallback((action: DiscoveryFeedbackAction) => {
        onFeedbackAction?.(event, action);
        setIsActionMenuOpen(false);
    }, [event, onFeedbackAction]);

    return (
        <div
            className={`flex flex-col rounded-[6px] p-5 transition-all duration-200 cursor-pointer group relative border border-border dark:border-border bg-card dark:bg-[#0a0a0a] hover:shadow-md dark:hover:shadow-none hover:bg-accent/10 hover:border-border-strong text-foreground ${accentClass}`}
            onClick={onClick}
            role="article"
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 min-w-0">
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
                    <div className="flex flex-col min-w-0">
                        <h3 className="text-[15px] font-medium text-foreground leading-tight group-hover:text-foreground transition-colors truncate" title={event.title}>
                            {event.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-gray-500 dark:text-muted-foreground/60">
                            <span>{dateLabel}</span>
                            <span>·</span>
                            <span>{timeLabel}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1 relative" ref={actionMenuRef}>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onShortlistToggle?.(event);
                        }}
                        className={`p-1.5 rounded-md transition-all duration-200 ${isInShortlist ? 'text-violet-300 bg-violet-500/10' : 'text-muted-foreground/40 hover:text-foreground hover:bg-accent/10'}`}
                        aria-pressed={isInShortlist}
                        aria-label={isInShortlist ? 'Remove from shortlist' : 'Add to shortlist'}
                    >
                        <Star size={16} weight={isInShortlist ? 'fill' : 'regular'} />
                    </button>

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
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsActionMenuOpen((prev) => !prev);
                        }}
                        className="p-1.5 rounded-md transition-all text-muted-foreground/50 hover:text-foreground hover:bg-accent/10"
                        aria-haspopup="menu"
                        aria-expanded={isActionMenuOpen}
                        aria-label="More actions"
                    >
                        <DotsThree size={16} weight="bold" />
                    </button>

                    {isActionMenuOpen && (
                        <div
                            role="menu"
                            className="absolute right-0 top-8 z-30 w-44 rounded-lg border border-border bg-popover p-1.5 shadow-xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                type="button"
                                className="w-full text-left rounded-md px-2.5 py-1.5 text-xs text-foreground hover:bg-accent/50"
                                onClick={() => {
                                    onExplainRecommendation?.(event);
                                    setIsActionMenuOpen(false);
                                }}
                            >
                                Why this event
                            </button>
                            <button
                                type="button"
                                className="w-full text-left rounded-md px-2.5 py-1.5 text-xs text-foreground hover:bg-accent/50"
                                onClick={() => runFeedbackAction('less-like-this')}
                            >
                                Less like this
                            </button>
                            <button
                                type="button"
                                className="w-full text-left rounded-md px-2.5 py-1.5 text-xs text-foreground hover:bg-accent/50"
                                onClick={() => runFeedbackAction('not-relevant')}
                            >
                                Not relevant
                            </button>
                            <button
                                type="button"
                                className="w-full text-left rounded-md px-2.5 py-1.5 text-xs text-rose-300 hover:bg-rose-500/10"
                                onClick={() => runFeedbackAction('hide')}
                            >
                                Hide event
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <p className={`text-[13px] text-muted-foreground/80 mb-4 leading-relaxed ${showRecommendationContext && event.careerImpact ? 'line-clamp-1' : 'line-clamp-2'}`}>
                {event.description || 'No description available for this event.'}
            </p>

            {showRecommendationContext && event.careerImpact && (
                <div className="mb-3">
                    <RecommendationContext
                        careerImpact={event.careerImpact}
                        event={{ attendeeCount: event.attendeeCount ?? null }}
                        variant="compact"
                    />
                </div>
            )}

            {quickFitBadges.length > 0 && (
                <div className="mb-3 flex flex-wrap items-center gap-1.5">
                    {quickFitBadges.map((badge) => (
                        <span
                            key={`${event.id}-${badge.id}`}
                            className={badge.id === 'schedule-conflict'
                                ? 'inline-flex items-center rounded-full border border-amber-400/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300'
                                : 'inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300'}
                        >
                            {badge.label}
                        </span>
                    ))}
                </div>
            )}

            <div className="mt-auto flex items-center justify-between pt-3 border-t border-border/50">
                <div className="flex items-center gap-2 text-[11px] font-mono text-gray-500 dark:text-muted-foreground/60 min-w-0">
                    <MapPin size={12} weight="fill" className="text-gray-400 dark:text-muted-foreground/40 flex-shrink-0" />
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
    const prevBadges = prevProps.quickFitBadges ?? [];
    const nextBadges = nextProps.quickFitBadges ?? [];
    const badgesEqual = prevBadges.length === nextBadges.length &&
        prevBadges.every((badge, index) => badge.id === nextBadges[index]?.id);

    return (
        prevProps.event === nextProps.event &&
        prevProps.isBookmarked === nextProps.isBookmarked &&
        prevProps.isBookmarking === nextProps.isBookmarking &&
        prevProps.showRecommendationContext === nextProps.showRecommendationContext &&
        prevProps.isInShortlist === nextProps.isInShortlist &&
        badgesEqual &&
        prevProps.onFeedbackAction === nextProps.onFeedbackAction &&
        prevProps.onExplainRecommendation === nextProps.onExplainRecommendation &&
        prevProps.onShortlistToggle === nextProps.onShortlistToggle
    );
});

EventCard.displayName = 'EventCard';

export default EventCard;
