'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import {
    MapPin,
} from '@phosphor-icons/react';
import { Event, CareerImpactScore } from '@/types';
import { CareerImpactScoreLite } from '@/types/careerImpact';
import { cn } from '@/lib/utils';
import { useEventEngagement } from '@/hooks/useEventEngagement';
import { getEventFormat, isEventFree } from '@/utils/filterCountUtils';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { useSwipeGestures } from '@/hooks/useSwipeGestures';
import { DiscoveryFeedbackAction } from '@/components/discovery/discoveryFeedback';
import { getSafeImageSrc, getVersionedImageSrc } from '@/utils/imageUrl';

export interface DiscoveryCardProps {
    event: Event & { careerImpactLite?: CareerImpactScoreLite; careerImpact?: CareerImpactScore };
    onClick?: () => void;
    onView?: () => void;
    className?: string;
    onFeedbackAction?: (event: Event & { careerImpactLite?: CareerImpactScoreLite; careerImpact?: CareerImpactScore }, action: DiscoveryFeedbackAction) => void;
    onShortlistToggle?: (event: Event & { careerImpactLite?: CareerImpactScoreLite; careerImpact?: CareerImpactScore }) => void;
    isInShortlist?: boolean;
    onSaved?: (event: Event & { careerImpactLite?: CareerImpactScoreLite; careerImpact?: CareerImpactScore }, source: 'bookmark' | 'swipe') => void;
    isAttending?: boolean;
    isAttendanceUpdating?: boolean;
    onAttendanceToggle?: (event: Event & { careerImpactLite?: CareerImpactScoreLite; careerImpact?: CareerImpactScore }) => Promise<void> | void;
}

const LONG_PRESS_DELAY_MS = 500;

const DiscoveryCard = React.memo<DiscoveryCardProps>(({
    event,
    onClick,
    onView,
    className = '',
    onFeedbackAction,
    onShortlistToggle,
    isInShortlist = false,
    onSaved,
    isAttending: isAttendingProp,
    isAttendanceUpdating: isAttendanceUpdatingProp,
    onAttendanceToggle,
}) => {
    const hasTrackedView = React.useRef(false);
    const gestureConsumedRef = useRef(false);
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);

    const { isBookmarked, toggleBookmark, getAttendanceStatus, setAttendanceStatus } = useEventEngagement();
    const { showError } = useSnackbar();

    const [isBookmarking, setIsBookmarking] = useState(false);
    const [internalIsAttendanceUpdating, setInternalIsAttendanceUpdating] = useState(false);
    const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);

    const isBookmarkedValue = isBookmarked(event.id);
    const internalIsAttending = getAttendanceStatus(event.id) === 'attending';
    const isAttending = typeof isAttendingProp === 'boolean' ? isAttendingProp : internalIsAttending;
    const isAttendanceUpdating = typeof isAttendanceUpdatingProp === 'boolean'
        ? isAttendanceUpdatingProp
        : internalIsAttendanceUpdating;
    const organizationLogoSrc = getSafeImageSrc(event.organization?.logo);
    const startDate = new Date(event.startTime);
    const dateLabel = format(startDate, 'EEE, MMM d');
    const timeLabel = format(startDate, 'h:mm a');

    React.useEffect(() => {
        if (!hasTrackedView.current && onView) {
            onView();
            hasTrackedView.current = true;
        }
    }, [onView]);

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
        if (organizationLogoSrc) {
            sources.push(organizationLogoSrc);
        }

        const eventImageSrc = getVersionedImageSrc(event.eventImageUrl, event.updatedAt);
        if (eventImageSrc) {
            sources.push(eventImageSrc);
        }

        return sources;
    }, [event.eventImageUrl, event.updatedAt, organizationLogoSrc]);

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

    const logoAltText = activeLogoSrc === organizationLogoSrc
        ? `${event.organization?.name ?? 'Event organizer'} logo`
        : `${event.title} event image`;

    const performBookmarkToggle = React.useCallback(async (
        options: { forceSaveOnly?: boolean; source: 'bookmark' | 'swipe' }
    ) => {
        if (isBookmarking) {
            return;
        }

        if (options.forceSaveOnly && isBookmarkedValue) {
            return;
        }

        setIsBookmarking(true);
        try {
            await toggleBookmark(event.id, event as any); // eslint-disable-line @typescript-eslint/no-explicit-any
            if (!isBookmarkedValue) {
                onSaved?.(event, options.source);
            }
        } catch (error) {
            const isLimit = error instanceof Error && error.message === 'BOOKMARK_LIMIT_REACHED';
            showError(isLimit ? 'Bookmark limit reached. Upgrade to add more.' : 'Failed to update bookmark');
        } finally {
            setIsBookmarking(false);
        }
    }, [event, isBookmarkedValue, isBookmarking, onSaved, showError, toggleBookmark]);

    const handleAttendanceToggle = React.useCallback(async () => {
        if (onAttendanceToggle) {
            try {
                await onAttendanceToggle(event);
            } catch (error) {
                showError('Failed to update attendance');
                console.error('Failed to toggle attendance from discovery card:', error);
            }
            return;
        }

        if (isAttendanceUpdating) {
            return;
        }

        setInternalIsAttendanceUpdating(true);
        try {
            await setAttendanceStatus(event.id, isAttending ? null : 'attending');
        } catch (error) {
            showError('Failed to update attendance');
            console.error('Failed to toggle attendance from discovery card:', error);
        } finally {
            setInternalIsAttendanceUpdating(false);
        }
    }, [onAttendanceToggle, event, isAttendanceUpdating, setAttendanceStatus, isAttending, showError]);

    const handleFeedback = React.useCallback((action: DiscoveryFeedbackAction) => {
        onFeedbackAction?.(event, action);
        setIsActionSheetOpen(false);
    }, [event, onFeedbackAction]);

    const clearLongPressTimer = React.useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }, []);

    React.useEffect(() => {
        return () => {
            clearLongPressTimer();
        };
    }, [clearLongPressTimer]);

    const { swipeHandlers, swipeState } = useSwipeGestures({
        threshold: 90,
        preventScroll: false,
        onSwipeRight: () => {
            gestureConsumedRef.current = true;
            void performBookmarkToggle({ forceSaveOnly: true, source: 'swipe' });
        },
        onSwipeLeft: () => {
            gestureConsumedRef.current = true;
            onFeedbackAction?.(event, 'hide');
        },
    });

    const handleTouchStart = React.useCallback((e: React.TouchEvent) => {
        swipeHandlers.onTouchStart?.(e);

        const touch = e.touches[0];
        touchStartRef.current = {
            x: touch.clientX,
            y: touch.clientY,
        };

        clearLongPressTimer();
        longPressTimerRef.current = setTimeout(() => {
            gestureConsumedRef.current = true;
            setIsActionSheetOpen(true);
        }, LONG_PRESS_DELAY_MS);
    }, [clearLongPressTimer, swipeHandlers]);

    const handleTouchMove = React.useCallback((e: React.TouchEvent) => {
        swipeHandlers.onTouchMove?.(e);

        if (!touchStartRef.current) {
            return;
        }

        const touch = e.touches[0];
        const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
        const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

        if (deltaX > 12 || deltaY > 12) {
            clearLongPressTimer();
        }
    }, [clearLongPressTimer, swipeHandlers]);

    const handleTouchEnd = React.useCallback(() => {
        swipeHandlers.onTouchEnd?.();
        clearLongPressTimer();
        touchStartRef.current = null;
    }, [clearLongPressTimer, swipeHandlers]);

    const translateX = swipeState.isActive
        ? Math.max(-22, Math.min(22, swipeState.deltaX * 0.22))
        : 0;

    const actionButtonClass = 'w-full text-left rounded-md px-3 py-2 text-sm hover:bg-accent/40 transition-colors';

    return (
        <>
            <div
                role="listitem"
                className={cn('w-full mb-4', className)}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                onClick={() => {
                    if (gestureConsumedRef.current) {
                        gestureConsumedRef.current = false;
                        return;
                    }
                    onClick?.();
                }}
            >
                <div
                    className="mobile-surface-card mobile-surface-card--interactive group/event-card relative flex flex-col p-[1.125rem] text-foreground"
                    style={{
                        transform: `translateX(${translateX}px)`,
                        transition: swipeState.isActive ? 'none' : 'transform 180ms ease',
                    }}
                >
                    <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[0.95rem] border border-[var(--mobile-app-surface-border)] bg-[color-mix(in_srgb,var(--mobile-app-surface-bg-strong)_82%,transparent)] p-1.5">
                            {activeLogoSrc ? (
                                <Image
                                    src={activeLogoSrc}
                                    alt={logoAltText}
                                    width={28}
                                    height={28}
                                    className="h-7 w-7 object-contain"
                                    onError={handleLogoError}
                                />
                            ) : (
                                <div className="text-base font-bold text-gray-400">
                                    {event.title.charAt(0)}
                                </div>
                            )}
                        </div>

                        <div className="min-w-0 flex-1">
                            <h3 className="line-clamp-2 text-[16px] font-semibold leading-tight text-foreground">
                                {event.title}
                            </h3>
                            <div className="mt-1 flex items-center gap-2 text-[11px] font-mono text-[var(--mobile-app-muted)]">
                                <span>{dateLabel}</span>
                                <span>·</span>
                                <span>{timeLabel}</span>
                            </div>
                        </div>

                    </div>

                    <p className="mb-4 mt-4 line-clamp-2 text-[13px] leading-relaxed text-[var(--mobile-app-muted)]">
                        {event.description || 'No description available for this event.'}
                    </p>

                    <div className="mt-auto flex items-center justify-between gap-3 border-t border-[var(--mobile-app-divider)] pt-3">
                        <div className="flex min-w-0 items-center gap-2 text-[11px] font-mono text-[var(--mobile-app-muted)]">
                            <MapPin size={12} weight="fill" className="flex-shrink-0 text-[var(--mobile-app-muted)]/70" />
                            <span className="truncate max-w-[128px]">{event.location || 'Location TBA'}</span>
                        </div>

                        <div className="flex flex-shrink-0 items-center gap-2">
                            <span className="rounded-[4px] bg-blue-50 px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                                {formatDisplay}
                            </span>
                            <span
                                className={cn(
                                    'rounded-[4px] px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider',
                                    isFree
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400'
                                        : 'bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-muted-foreground'
                                )}
                            >
                                {priceDisplay}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {isActionSheetOpen && (
                <div className="fixed inset-0 z-[130] flex items-end" role="dialog" aria-modal="true" aria-label="Event actions">
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/55"
                        onClick={() => setIsActionSheetOpen(false)}
                        aria-label="Close actions"
                    />
                    <div className="relative w-full rounded-t-2xl border-t border-border bg-background p-4 pb-6 space-y-1">
                        <button
                            type="button"
                            className={actionButtonClass}
                            onClick={() => {
                                onShortlistToggle?.(event);
                                setIsActionSheetOpen(false);
                            }}
                        >
                            {isInShortlist ? 'Remove from shortlist' : 'Add to shortlist'}
                        </button>
                        <button type="button" className={actionButtonClass} onClick={() => handleFeedback('less-like-this')}>
                            Less like this
                        </button>
                        <button type="button" className={actionButtonClass} onClick={() => handleFeedback('not-relevant')}>
                            Not relevant
                        </button>
                        <button
                            type="button"
                            className={cn(actionButtonClass, 'text-rose-300 hover:bg-rose-500/10')}
                            onClick={() => handleFeedback('hide')}
                        >
                            Hide event
                        </button>
                        <button
                            type="button"
                            className={cn(actionButtonClass, 'text-muted-foreground')}
                            onClick={() => setIsActionSheetOpen(false)}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </>
    );
});

DiscoveryCard.displayName = 'DiscoveryCard';

export default DiscoveryCard;
