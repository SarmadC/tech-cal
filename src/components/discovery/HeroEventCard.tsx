'use client';

import React from 'react';
import { Event, CareerImpactScore } from '@/types';
import { MapPin, BookmarkSimple, DotsThree, Exclude, UserCheck } from '@phosphor-icons/react';
import { format } from 'date-fns';
import Image from 'next/image';
import { getEventFormat, isEventFree } from '@/utils/filterCountUtils';
import { DiscoveryFeedbackAction } from './discoveryFeedback';
import { getSafeImageSrc, getVersionedImageSrc } from '@/utils/imageUrl';

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

    const startDate = new Date(event.startTime);
    const monthLabel = format(startDate, 'MMM').toUpperCase();
    const dayNumeric = format(startDate, 'd');
    const dayOfWeek = format(startDate, 'EEE').toUpperCase();
    const timeLabel = format(startDate, 'h:mm a');

    // We can extract venue/street from location if it's comma separated, but for safety we'll just format the string.
    const locationParts = event.location ? event.location.split(',').map(s => s.trim()) : [];
    const venueName = locationParts.length > 0 ? locationParts[0] : 'Venue TBA';
    const locationDetails = locationParts.length > 1 ? locationParts.slice(1).join(', ') : 'Location details TBA';
    const organizationLogoSrc = getSafeImageSrc(event.organization?.logo);
    const imageSources = React.useMemo(() => {
        const sources: string[] = [];
        const eventImageSrc = getVersionedImageSrc(event.eventImageUrl, event.updatedAt);
        if (eventImageSrc) sources.push(eventImageSrc);
        if (organizationLogoSrc) sources.push(organizationLogoSrc);
        return sources;
    }, [event.eventImageUrl, organizationLogoSrc, event.updatedAt]);

    const [activeImageSrc, setActiveImageSrc] = React.useState<string | null>(() => imageSources[0] ?? null);

    React.useEffect(() => {
        setActiveImageSrc(imageSources[0] ?? null);
    }, [event.id, imageSources]);

    const handleImageError = React.useCallback(() => {
        if (!activeImageSrc) return;
        const currentIndex = imageSources.indexOf(activeImageSrc);
        const nextSrc = currentIndex >= 0 ? imageSources[currentIndex + 1] : undefined;
        setActiveImageSrc(nextSrc ?? null);
    }, [activeImageSrc, imageSources]);

    const imageAltText = activeImageSrc === organizationLogoSrc
        ? `${event.organization?.name ?? 'Event organizer'} logo`
        : `${event.title} event image`;

    const cardRef = React.useRef<HTMLDivElement>(null);
    const [isActionMenuOpen, setIsActionMenuOpen] = React.useState(false);
    const actionMenuRef = React.useRef<HTMLDivElement>(null);

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



    return (
        <div
            ref={cardRef}
            onClick={onClick}
            className="group relative overflow-hidden rounded-[32px] w-full min-h-[440px] shadow-md flex flex-col justify-end cursor-pointer transition-transform duration-300 hover:scale-[1.01]"
        >
            {/* Background Image */}
            {activeImageSrc ? (
                <>
                    <div className="absolute inset-0 bg-black/40" />
                    {/* If using logo as fallback, apply letterboxing with blurred background */}
                    {activeImageSrc === organizationLogoSrc && (
                        <Image
                            src={activeImageSrc}
                            alt=""
                            fill
                            className="object-cover opacity-30 blur-3xl scale-110"
                        />
                    )}
                    <Image
                        src={activeImageSrc}
                        alt={imageAltText}
                        fill
                        className={`transition-transform duration-700 group-hover:scale-105 ${activeImageSrc === organizationLogoSrc ? 'object-contain p-12 opacity-80' : 'object-cover'}`}
                        onError={handleImageError}
                    />
                </>
            ) : (
                <div className="absolute inset-0 bg-muted/20 flex items-center justify-center">
                    <span className="text-4xl font-bold text-muted-foreground/30">{event.title.charAt(0)}</span>
                </div>
            )}

            {/* Content Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

            {/* Bottom Content Block */}
            <div className="relative z-10 p-6 sm:p-8 flex flex-col pt-32">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight md:leading-[1.1] mb-8 drop-shadow-sm line-clamp-3 pr-4 text-balance">
                    {event.title}
                </h2>

                <div className="flex items-center justify-between gap-5 w-full border-t border-white/20 pt-4 mt-auto">
                    {/* Date & Location Details */}
                    <div className="flex flex-col min-w-0 pr-4">
                        <span className="text-white font-bold text-[15px] sm:text-[16px] truncate mb-0.5">{monthLabel} {dayNumeric}</span>
                        <span className="text-white/90 font-medium text-[14px] sm:text-[15px] truncate">{venueName} {locationDetails ? `• ${locationDetails}` : ''}</span>
                    </div>

                    {/* Time Details */}
                    <div className="flex flex-col items-end shrink-0 ml-auto">
                        <span className="text-white font-medium text-[15px] sm:text-[16px]">{timeLabel}</span>
                        <span className="text-white/60 text-[11px] font-medium tracking-wide mt-0.5">EST</span>
                    </div>
                </div>
            </div>

            {/* Action Buttons (Absolute Top Right) */}
            <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20" ref={actionMenuRef}>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onAttendanceToggle?.(event);
                    }}
                    className={`p-2 rounded-full backdrop-blur-md transition-all ${isAttending ? 'bg-emerald-500/80 text-white' : 'bg-black/20 text-white/80 hover:bg-black/40 hover:text-white'} ${isAttendanceUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                    aria-pressed={isAttending}
                    disabled={isAttendanceUpdating}
                >
                    <UserCheck size={18} weight={isAttending ? 'fill' : 'regular'} />
                </button>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onBookmark?.(event);
                    }}
                    className={`p-2 rounded-full backdrop-blur-md transition-all ${isBookmarked ? 'bg-amber-500/80 text-white' : 'bg-black/20 text-white/80 hover:bg-black/40 hover:text-white'} ${isBookmarking ? 'opacity-50 cursor-not-allowed' : ''}`}
                    aria-pressed={isBookmarked}
                    disabled={isBookmarking}
                >
                    <BookmarkSimple size={18} weight={isBookmarked ? 'fill' : 'regular'} />
                </button>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onShortlistToggle?.(event);
                    }}
                    className={`p-2 rounded-full backdrop-blur-md transition-all ${isInShortlist ? 'bg-violet-500/80 text-white' : 'bg-black/20 text-white/80 hover:bg-black/40 hover:text-white'}`}
                    aria-pressed={isInShortlist}
                >
                    <Exclude size={18} weight={isInShortlist ? 'fill' : 'regular'} />
                </button>
                <div className="relative flex">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsActionMenuOpen((prev) => !prev);
                        }}
                        className="p-2 rounded-full backdrop-blur-md bg-black/20 text-white/80 hover:bg-black/40 hover:text-white transition-all"
                    >
                        <DotsThree size={18} weight="bold" />
                    </button>
                    {isActionMenuOpen && (
                        <div
                            role="menu"
                            className="absolute right-0 top-10 z-40 w-44 rounded-md border border-white/10 bg-black/80 backdrop-blur-lg p-1 shadow-lg"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                type="button"
                                className="w-full text-left rounded-sm px-3 py-2 text-[13px] font-medium text-white/90 hover:bg-white/10 hover:text-white"
                                onClick={() => {
                                    onFeedbackAction?.(event, 'less-like-this');
                                    setIsActionMenuOpen(false);
                                }}
                            >
                                Less like this
                            </button>
                            <button
                                type="button"
                                className="w-full text-left rounded-sm px-3 py-2 text-[13px] font-medium text-white/90 hover:bg-white/10 hover:text-white"
                                onClick={() => {
                                    onFeedbackAction?.(event, 'not-relevant');
                                    setIsActionMenuOpen(false);
                                }}
                            >
                                Not relevant
                            </button>
                            <button
                                type="button"
                                className="w-full text-left rounded-sm px-3 py-2 text-[13px] font-medium text-rose-400 hover:bg-rose-500/20"
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
        </div>
    );
};

export default HeroEventCard;
