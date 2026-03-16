'use client';

import React, { useState } from 'react';
import { Event, CareerImpactScore } from '@/types';
import { CaretRight } from '@phosphor-icons/react';
import EventCard from './EventCard';
import { DiscoveryFeedbackAction } from './discoveryFeedback';

type EventWithImpact = Event & { careerImpact?: CareerImpactScore };

interface DiscoverySectionBlockProps {
    id?: string;
    title: string;
    subtitle?: string;
    events: EventWithImpact[];
    onEventSelect?: (event: Event) => void;
    onBookmark?: (event: Event) => Promise<void> | void;
    onAttendanceToggle?: (event: Event) => Promise<void> | void;
    isBookmarked: (eventId: string) => boolean;
    isAttending: (eventId: string) => boolean;
    pendingBookmarkIds: Set<string>;
    pendingAttendanceIds: Set<string>;
    defaultVisibleCount?: number;
    expanded?: boolean;
    onExpandedChange?: (expanded: boolean) => void;
    onFeedbackAction?: (event: EventWithImpact, action: DiscoveryFeedbackAction) => void;
    onExplainRecommendation?: (event: EventWithImpact) => void;
    onShortlistToggle?: (event: EventWithImpact) => void;
    isInShortlist?: (eventId: string) => boolean;
}

const DiscoverySectionBlock: React.FC<DiscoverySectionBlockProps> = ({
    title,
    subtitle,
    events,
    onEventSelect,
    onBookmark,
    onAttendanceToggle,
    isBookmarked,
    isAttending,
    pendingBookmarkIds,
    pendingAttendanceIds,
    defaultVisibleCount = 3,
    expanded,
    onExpandedChange,
    onFeedbackAction,
    onExplainRecommendation,
    onShortlistToggle,
    isInShortlist,
}) => {
    const [internalExpanded, setInternalExpanded] = useState(false);
    const isExpanded = expanded ?? internalExpanded;
    const visibleEvents = isExpanded ? events : events.slice(0, defaultVisibleCount);
    const hasMore = events.length > defaultVisibleCount;

    const handleToggleExpanded = () => {
        const next = !isExpanded;
        if (expanded === undefined) {
            setInternalExpanded(next);
        }
        onExpandedChange?.(next);
    };

    return (
        <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h3 className="text-sm font-medium text-foreground">
                        {title}
                    </h3>
                    {subtitle && (
                        <p className="text-[11px] text-muted-foreground/60 mt-0.5">{subtitle}</p>
                    )}
                </div>
                {hasMore && (
                    <button
                        type="button"
                        onClick={handleToggleExpanded}
                        className="flex items-center gap-1 text-[11px] text-muted-foreground/60 hover:text-foreground transition-colors"
                    >
                        {isExpanded ? 'Show less' : `See all ${events.length}`}
                        <CaretRight size={10} weight="bold" className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {visibleEvents.map((event) => (
                    <EventCard
                        key={event.id}
                        event={event}
                        onClick={() => onEventSelect?.(event)}
                        onBookmark={onBookmark}
                        onAttendanceToggle={onAttendanceToggle}
                        isBookmarked={isBookmarked(event.id)}
                        isBookmarking={pendingBookmarkIds.has(event.id)}
                        isAttending={isAttending(event.id)}
                        isAttendanceUpdating={pendingAttendanceIds.has(event.id)}
                        onFeedbackAction={onFeedbackAction}
                        onExplainRecommendation={onExplainRecommendation}
                        onShortlistToggle={onShortlistToggle}
                        isInShortlist={isInShortlist?.(event.id)}
                    />
                ))}
            </div>
        </section>
    );
};

export default DiscoverySectionBlock;
