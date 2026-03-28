'use client';

import React from 'react';
import { Event, CareerImpactScore } from '@/types';
import { Sparkle } from '@phosphor-icons/react';
import HeroEventCard from './HeroEventCard';
import { selectTopPickEvents } from './discoveryRanking';
import { DiscoveryFeedbackAction } from './discoveryFeedback';

type EventWithImpact = Event & { careerImpact?: CareerImpactScore };

interface HeroSpotlightProps {
    events: EventWithImpact[];
    onEventSelect?: (event: Event) => void;
    onBookmark?: (event: Event) => Promise<void> | void;
    onAttendanceToggle?: (event: Event) => Promise<void> | void;
    onFeedbackAction?: (event: EventWithImpact, action: DiscoveryFeedbackAction) => void;
    onShortlistToggle?: (event: EventWithImpact) => void;
    isInShortlist?: (eventId: string) => boolean;
    isBookmarked: (eventId: string) => boolean;
    isAttending: (eventId: string) => boolean;
    pendingBookmarkIds: Set<string>;
    pendingAttendanceIds: Set<string>;
}

const HeroSpotlight: React.FC<HeroSpotlightProps> = ({
    events,
    onEventSelect,
    onBookmark,
    onAttendanceToggle,
    onFeedbackAction,
    onShortlistToggle,
    isInShortlist,
    isBookmarked,
    isAttending,
    pendingBookmarkIds,
    pendingAttendanceIds,
}) => {
    const heroEvents = React.useMemo(() => selectTopPickEvents(events), [events]);

    if (heroEvents.length === 0) return null;

    const gridClass = 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6';

    return (
        <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
                <Sparkle size={18} weight="fill" className="text-amber-400" />
                <h2 className="text-sm font-medium text-foreground">
                    Your Top Picks
                </h2>
            </div>

            <div className={gridClass}>
                {heroEvents.map((event) => (
                    <div className={heroEvents.length === 1 ? 'md:col-span-2' : 'col-span-1'} key={event.id}>
                        <HeroEventCard
                            event={event}
                            onClick={() => onEventSelect?.(event)}
                            onBookmark={onBookmark}
                            onAttendanceToggle={onAttendanceToggle}
                            onFeedbackAction={onFeedbackAction}
                            onShortlistToggle={onShortlistToggle}
                            isInShortlist={isInShortlist?.(event.id)}
                            isBookmarked={isBookmarked(event.id)}
                            isBookmarking={pendingBookmarkIds.has(event.id)}
                            isAttending={isAttending(event.id)}
                            isAttendanceUpdating={pendingAttendanceIds.has(event.id)}
                        />
                    </div>
                ))}
            </div>
        </section>
    );
};

export default HeroSpotlight;
