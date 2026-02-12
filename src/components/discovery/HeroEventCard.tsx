'use client';

import React from 'react';
import { Event, CareerImpactScore } from '@/types';
import { MapPin, BookmarkSimple, CalendarBlank, Ticket, DotsThree, Star } from '@phosphor-icons/react';
import { format } from 'date-fns';
import Image from 'next/image';
import { isEventFree } from '@/utils/filterCountUtils';
import { buildRecommendationHighlights } from './recommendationReasoning';
import { ProgressBar } from '@/components/dashboard/ProgressBar';
import { DiscoveryFeedbackAction } from './discoveryFeedback';

interface HeroEventCardProps {
    event: Event & { careerImpact?: CareerImpactScore };
    onClick?: () => void;
    onBookmark?: (event: Event) => Promise<void> | void;
    onFeedbackAction?: (event: Event & { careerImpact?: CareerImpactScore }, action: DiscoveryFeedbackAction) => void;
    onShortlistToggle?: (event: Event & { careerImpact?: CareerImpactScore }) => void;
    isInShortlist?: boolean;
    isBookmarked?: boolean;
    isBookmarking?: boolean;
}

const HeroEventCard: React.FC<HeroEventCardProps> = ({
    event,
    onClick,
    onBookmark,
    onFeedbackAction,
    onShortlistToggle,
    isInShortlist = false,
    isBookmarked = false,
    isBookmarking = false
}) => {
    const startDate = new Date(event.startTime);
    // Mockup format: "March 15, 2026"
    const dateLabel = format(startDate, 'MMMM d, yyyy');
    const isFree = isEventFree(event);

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
            className="group relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#0A0A0A] p-6 backdrop-blur-md transition-all duration-500 hover:border-white/[0.12] hover:bg-[#101010] hover:shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset,0_24px_48px_-12px_rgba(0,0,0,0.5)] md:grid md:grid-cols-[1.6fr,1fr] md:gap-12"
            onClick={onClick}
        >
            {/* Spotlight Gradient - Made subtler */}
            <div
                className="pointer-events-none absolute -inset-px opacity-0 transition duration-500 group-hover:opacity-100"
                style={{
                    background: `radial-gradient(800px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(255,255,255,0.04), transparent 40%)`,
                }}
            />

            {/* Left Pane: Main Info (65%) */}
            <div className="flex flex-col relative z-10 h-full">
                {/* Header: Logo + Title */}
                <div className="flex items-start gap-4 mb-4">
                    {/* Logo - Dimmed by default, color on hover */}
                    <div className="w-12 h-12 shrink-0 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-center overflow-hidden shadow-sm transition-all duration-500 group-hover:border-white/[0.1] group-hover:bg-white/[0.05]">
                        {activeLogoSrc ? (
                            <Image
                                src={activeLogoSrc}
                                alt={logoAltText}
                                width={48}
                                height={48}
                                className="w-full h-full object-contain p-1.5 opacity-50 grayscale transition-all duration-500 group-hover:opacity-100 group-hover:grayscale-0"
                                onError={handleLogoError}
                            />
                        ) : (
                            <div className="text-xl font-bold text-white/20 group-hover:text-white/40 transition-colors">
                                {event.title.charAt(0)}
                            </div>
                        )}
                    </div>

                    <div className="min-w-0 flex flex-col pt-0.5">
                        <div className="flex items-center gap-2 mb-1.5">

                            <h3 className="text-[18px] font-medium text-white/90 leading-tight tracking-tight group-hover:text-white transition-colors truncate pr-4">
                                {event.title}
                            </h3>
                        </div>
                    </div>
                </div>

                {/* Description */}
                <p className="text-[15px] text-white/60 mb-8 leading-relaxed line-clamp-3 pr-4 font-normal">
                    {event.description || 'No description available for this event.'}
                </p>

                {/* Footer: Meta (Icons + Monospace) */}
                <div className="mt-auto flex items-center gap-6 text-[13px] font-mono text-white/40">
                    <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-white/30" />
                        <span className="truncate max-w-[140px]">{event.location || 'TBA'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CalendarBlank size={14} className="text-white/30" />
                        <span>{dateLabel}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Ticket size={14} className="text-white/30" />
                        <span>{priceDisplay}</span>
                    </div>
                </div>
            </div>

            {/* Right Pane: Highlights (35%) - "Stealth" Sidebar */}
            <div className="hidden md:flex flex-col relative z-10 h-full pt-1">
                <div className="flex items-end gap-4 mb-6">
                    <div className="flex-1">
                        <div className="mb-2 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-gray-500 font-sans">
                                {recommendationScore}% match
                            </span>

                        </div>
                        <ProgressBar
                            value={recommendationScore}
                            showPercentage={false}
                            height="h-1"
                            bgColor="bg-blue-500/20"
                            color="bg-blue-500"
                            className="space-y-0"
                        />
                    </div>

                    <div className="flex items-center gap-1 mb-0.5 relative" ref={actionMenuRef}>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onShortlistToggle?.(event);
                            }}
                            className={`p-1.5 rounded-md shrink-0 transition-all duration-200 ${isInShortlist ? 'text-violet-300 bg-violet-500/15' : 'text-white/20 hover:text-white/80 hover:bg-white/5'}`}
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
                            className={`p-1.5 rounded-md shrink-0 transition-all duration-200 ${isBookmarked ? 'text-amber-400' : 'text-white/10 hover:text-white/60 hover:bg-white/5'} ${isBookmarking ? 'opacity-50 cursor-not-allowed' : ''}`}
                            aria-pressed={isBookmarked}
                            disabled={isBookmarking}
                        >
                            <BookmarkSimple size={16} weight={isBookmarked ? 'fill' : 'regular'} />
                        </button>

                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsActionMenuOpen((prev) => !prev);
                            }}
                            className="p-1.5 rounded-md text-white/20 hover:text-white/70 hover:bg-white/5 transition-colors"
                            aria-haspopup="menu"
                            aria-expanded={isActionMenuOpen}
                        >
                            <DotsThree size={16} weight="bold" />
                        </button>

                        {isActionMenuOpen && (
                            <div
                                role="menu"
                                className="absolute right-0 top-8 z-40 w-44 rounded-lg border border-white/10 bg-[#121212] p-1.5 shadow-xl"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    type="button"
                                    className="w-full text-left rounded-md px-2.5 py-1.5 text-xs text-white/90 hover:bg-white/10"
                                    onClick={() => {
                                        onFeedbackAction?.(event, 'less-like-this');
                                        setIsActionMenuOpen(false);
                                    }}
                                >
                                    Less like this
                                </button>
                                <button
                                    type="button"
                                    className="w-full text-left rounded-md px-2.5 py-1.5 text-xs text-white/90 hover:bg-white/10"
                                    onClick={() => {
                                        onFeedbackAction?.(event, 'not-relevant');
                                        setIsActionMenuOpen(false);
                                    }}
                                >
                                    Not relevant
                                </button>
                                <button
                                    type="button"
                                    className="w-full text-left rounded-md px-2.5 py-1.5 text-xs text-rose-300 hover:bg-rose-500/10"
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
                    <ul className="space-y-4 opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                        {reasons.map((reason, idx) => {
                            const parts = reason.split(': ');
                            const hasKey = parts.length > 1;
                            const label = hasKey ? parts[0] + ':' : null;
                            const value = hasKey ? parts.slice(1).join(': ') : reason;

                            return (
                                <li key={idx} className="flex items-start gap-3">
                                    {/* Custom Dash Bullet */}
                                    <div className="w-2.5 h-[1.5px] bg-white/20 mt-[7px] shrink-0 rounded-full" />
                                    <span className="text-[13px] leading-snug">
                                        {hasKey ? (
                                            <>
                                                <span className="text-[#8A8F98]">{label} </span>
                                                <span className="text-white font-medium">{value}</span>
                                            </>
                                        ) : (
                                            <span className="text-white/50">{value}</span>
                                        )}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <div className="flex items-center justify-center h-full text-[13px] text-white/20 italic font-mono opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        Recommended for you
                    </div>
                )}
            </div>

            {/* Mobile Bookmark (Absolute top right) */}
            <div className="absolute top-4 right-4 md:hidden z-20">
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onBookmark?.(event);
                    }}
                    className={`p-2 rounded-full backdrop-blur-sm transition-all duration-200 ${isBookmarked ? 'text-amber-400 bg-amber-400/10' : 'text-white/40 bg-white/5'}`}
                >
                    <BookmarkSimple size={18} weight={isBookmarked ? 'fill' : 'regular'} />
                </button>
            </div>
        </div>
    );
};

export default HeroEventCard;
