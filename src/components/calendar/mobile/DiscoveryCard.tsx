'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import {
    MapPin,
    BookmarkSimple,
    Calendar,
    Exclude,
    DotsThree,
    UserCheck,
} from '@phosphor-icons/react';
import { Event, CareerImpactScore } from '@/types';
import { CareerImpactScoreLite } from '@/types/careerImpact';
import { cn } from '@/lib/utils';
import { formatDate } from '@/utils/dateUtils';
import { useEventEngagement } from '@/hooks/useEventEngagement';
import { getEventFormat, isEventFree } from '@/utils/filterCountUtils';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { useSwipeGestures } from '@/hooks/useSwipeGestures';
import { DiscoveryFeedbackAction } from '@/components/discovery/discoveryFeedback';
import { QuickFitBadge } from '@/components/discovery/quickFitBadges';

export interface DiscoveryCardProps {
    event: Event & { careerImpactLite?: CareerImpactScoreLite; careerImpact?: CareerImpactScore };
    onClick?: () => void;
    onView?: () => void;
    onLearnMore?: () => void;
    className?: string;
    variant?: 'default' | 'featured' | 'compact';
    showCareerImpact?: boolean;
    showLearnMore?: boolean;
    badges?: React.ReactNode;
    quickFitBadges?: QuickFitBadge[];
    onFeedbackAction?: (event: Event & { careerImpactLite?: CareerImpactScoreLite; careerImpact?: CareerImpactScore }, action: DiscoveryFeedbackAction) => void;
    onExplainRecommendation?: (event: Event & { careerImpactLite?: CareerImpactScoreLite; careerImpact?: CareerImpactScore }) => void;
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
    onLearnMore: _onLearnMore,
    className = '',
    variant: _variant = 'default',
    showCareerImpact: _showCareerImpact = true,
    showLearnMore: _showLearnMore = false,
    badges: _badges,
    quickFitBadges = [],
    onFeedbackAction,
    onExplainRecommendation,
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

    React.useEffect(() => {
        if (!hasTrackedView.current && onView) {
            onView();
            hasTrackedView.current = true;
        }
    }, [onView]);

    const displayScore = React.useMemo(() => {
        const raw = event.careerImpact?.overall ?? event.careerImpactLite?.overall ?? 0;
        return Math.min(100, Math.max(0, raw <= 1 ? raw * 100 : raw));
    }, [event.careerImpact?.overall, event.careerImpactLite?.overall]);

    const isFree = isEventFree(event);
    const eventFormat = getEventFormat(event);

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
                    className="rounded-[12px] p-4 relative overflow-hidden bg-transparent border border-[var(--border-default)] transition-colors group"
                    style={{
                        transform: `translateX(${translateX}px)`,
                        transition: swipeState.isActive ? 'none' : 'transform 180ms ease',
                    }}
                >
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-lg overflow-hidden bg-[var(--background-tertiary)] border border-[var(--border-default)] flex items-center justify-center">
                            {(() => {
                                const imageSrc = event.organization?.logo || event.eventImageUrl;
                                if (imageSrc) {
                                    return (
                                        <Image
                                            src={imageSrc}
                                            alt={event.title}
                                            width={32}
                                            height={32}
                                            className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all"
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                            }}
                                        />
                                    );
                                }

                                return (
                                    <div className="w-full h-full flex items-center justify-center font-bold text-xs text-[var(--foreground-muted)]" style={{ backgroundColor: 'var(--background-elevated)' }}>
                                        {event.title.charAt(0)}
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="flex-1 min-w-0 pt-0.5">
                            <h3 className="text-[16px] font-semibold text-[var(--foreground-primary)] leading-snug line-clamp-2">
                                {event.title}
                            </h3>
                        </div>

                        <div className="flex items-center gap-1 -mt-1 -mr-1">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    void handleAttendanceToggle();
                                }}
                                className={cn(
                                    'p-2 rounded-md transition-colors',
                                    isAttending
                                        ? 'text-emerald-300'
                                        : 'text-[var(--foreground-tertiary)] hover:text-[var(--foreground-primary)] hover:bg-[var(--background-elevated)]',
                                    isAttendanceUpdating ? 'opacity-50 cursor-not-allowed' : ''
                                )}
                                aria-pressed={isAttending}
                                aria-label={isAttending ? 'Remove attending status' : 'Mark as attending'}
                                disabled={isAttendanceUpdating}
                            >
                                <UserCheck size={16} weight={isAttending ? 'fill' : 'regular'} />
                            </button>

                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    void performBookmarkToggle({ source: 'bookmark' });
                                }}
                                className="p-2 rounded-md text-[var(--foreground-tertiary)] hover:text-[var(--foreground-primary)] hover:bg-[var(--background-elevated)] transition-colors"
                                aria-label={isBookmarkedValue ? 'Remove bookmark' : 'Bookmark'}
                            >
                                <BookmarkSimple weight={isBookmarkedValue ? 'fill' : 'bold'} className={isBookmarkedValue ? 'text-[var(--foreground-primary)]' : 'text-[var(--foreground-tertiary)]'} size={18} />
                            </button>

                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsActionSheetOpen(true);
                                }}
                                className="p-2 rounded-md text-[var(--foreground-tertiary)] hover:text-[var(--foreground-primary)] hover:bg-[var(--background-elevated)] transition-colors"
                                aria-label="Open actions"
                            >
                                <DotsThree size={16} weight="bold" />
                            </button>
                        </div>
                    </div>

                    <p className="mt-2 text-[13px] text-[var(--foreground-secondary)] leading-relaxed line-clamp-2 font-normal">
                        {event.description || 'No description available.'}
                    </p>

                    <div className="mt-3">
                        <div className="flex items-center justify-between text-[11px]">
                            <span className="text-[var(--foreground-tertiary)]">Recommendation</span>
                            <span className="text-[var(--foreground-secondary)] font-medium">{Math.round(displayScore)}%</span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-[var(--background-tertiary)] overflow-hidden">
                            <div
                                className="h-full rounded-full bg-[var(--accent-primary)] transition-all"
                                style={{ width: `${displayScore}%` }}
                            />
                        </div>
                    </div>

                    {quickFitBadges.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                            {quickFitBadges.map((badge) => (
                                <span
                                    key={`${event.id}-${badge.id}`}
                                    className={badge.id === 'schedule-conflict'
                                        ? 'inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300'
                                        : 'inline-flex items-center rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300'}
                                >
                                    {badge.label}
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="mt-3 flex items-center gap-3 text-[12px] text-[var(--foreground-tertiary)] font-mono whitespace-nowrap overflow-hidden">
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            <Calendar size={14} weight="regular" className="text-[var(--foreground-muted)]" />
                            <span>{formatDate(event.startTime, event.timezone)}</span>
                        </div>
                        {event.location && (
                            <>
                                <span className="text-[var(--border-strong)]">•</span>
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <MapPin size={14} weight="regular" className="text-[var(--foreground-muted)] flex-shrink-0" />
                                    <span className="truncate">{event.location}</span>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[var(--background-tertiary)] border border-[var(--border-subtle)]">
                            <div className={cn('w-1 h-1 rounded-full',
                                eventFormat === 'virtual' ? 'bg-blue-500' :
                                    eventFormat === 'hybrid' ? 'bg-purple-500' : 'bg-orange-500'
                            )} />
                            <span className="text-[11px] text-[var(--foreground-secondary)]">
                                {eventFormat === 'virtual' ? 'Remote' : eventFormat === 'hybrid' ? 'Hybrid' : 'In-Person'}
                            </span>
                        </div>

                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[var(--background-tertiary)] border border-[var(--border-subtle)]">
                            <div className={cn('w-1 h-1 rounded-full', isFree ? 'bg-green-500' : 'bg-[var(--foreground-primary)]')} />
                            <span className="text-[11px] text-[var(--foreground-secondary)]">
                                {isFree ? 'Free' : 'Paid'}
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
                                onExplainRecommendation?.(event);
                                setIsActionSheetOpen(false);
                            }}
                        >
                            Why this event
                        </button>
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
