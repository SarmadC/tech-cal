'use client';

import Image from 'next/image';
import { CalendarIcon, ClockIcon, MapPinIcon, SparkleIcon, BookmarkSimpleIcon, TargetIcon } from '@phosphor-icons/react';
import { format, differenceInDays } from 'date-fns';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { useEventEngagement } from '@/hooks/useEventEngagement';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { getImpactBucketLabel } from '@/config/recommendationThresholds';
import type { CareerProfile, Event, TrackedEventRecord } from '@/types';
import { MobileDashboardCard } from './MobileDashboardCard';
import styles from './MobileTopRecommendationCard.module.css';

interface MobileTopRecommendationCardProps {
    trackedEvents: TrackedEventRecord[];
    upcomingEvents: Event[];
    careerProfile: CareerProfile | null;
    onSelectEvent: (event: Event) => void;
}

export function MobileTopRecommendationCard({
    trackedEvents,
    upcomingEvents,
    careerProfile,
    onSelectEvent,
}: MobileTopRecommendationCardProps) {
    const { toggleBookmark, isBookmarked } = useEventEngagement();
    const { showError } = useSnackbar();

    const metrics = useDashboardMetrics({
        trackedEvents,
        upcomingEvents,
        careerProfile,
    });

    const topRecommendation = metrics.topRecommendedEvent;

    const handleBookmark = async (event: Event) => {
        try {
            await toggleBookmark(event.id, event as unknown as Record<string, unknown>);
        } catch (error) {
            const isLimit = error instanceof Error && error.message === 'BOOKMARK_LIMIT_REACHED';
            showError(isLimit ? 'Bookmark limit reached. Upgrade to add more.' : 'Failed to bookmark event');
            if (!isLimit) {
                console.error(error);
            }
        }
    };

    if (!topRecommendation) {
        return (
            <MobileDashboardCard className={styles.emptyCard}>
                <TargetIcon className={styles.emptyIcon} weight="duotone" />
                <p className={styles.emptyTitle}>No recommendations yet</p>
            </MobileDashboardCard>
        );
    }

    const event = topRecommendation.event;
    const daysUntil = Math.max(0, differenceInDays(new Date(event.startTime), new Date()));
    const hostName = event.organizer || 'Organizer';
    const impactBucket = getImpactBucketLabel(topRecommendation.score);
    const bookmarked = isBookmarked(event.id);

    return (
        <MobileDashboardCard
            className={styles.card}
            interactive={true}
            onClick={() => onSelectEvent(event)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectEvent(event);
                }
            }}
            role="button"
            tabIndex={0}
        >


            <div className={styles.eyebrow}>
                <SparkleIcon className="h-3 w-3" weight="fill" />
                <span>Recommended</span>
                {impactBucket.label === 'High Impact' && (
                    <span className={styles.impactBadge}>High Impact</span>
                )}
            </div>

            <h3 className={styles.title}>{event.title}</h3>

            <div className={styles.meta}>
                <span>{format(new Date(event.startTime), 'MMM d, yyyy')}</span>
                {event.location && (
                    <>
                        <span className={styles.metaDot}>&middot;</span>
                        <span>{event.location}</span>
                    </>
                )}
                <span className={styles.metaDot}>&middot;</span>
                <span>{daysUntil === 0 ? 'Today' : `${daysUntil} days away`}</span>
            </div>

            <p className={styles.description}>
                {event.description || topRecommendation.reason}
            </p>

            <button type="button" className={styles.primaryCta}>
                View event
            </button>
        </MobileDashboardCard>
    );
}
