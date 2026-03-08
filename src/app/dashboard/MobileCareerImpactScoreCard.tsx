'use client';

import { ChartLineUpIcon } from '@phosphor-icons/react';
import { useCareerMetrics } from '@/hooks/useCareerMetrics';
import type { Event, TrackedEventRecord } from '@/types';
import styles from './MobileCareerImpactScoreCard.module.css';

interface MobileCareerImpactScoreCardProps {
    allEvents: Event[];
    trackedEvents: TrackedEventRecord[];
}

export function MobileCareerImpactScoreCard({
    allEvents: _allEvents,
    trackedEvents,
}: MobileCareerImpactScoreCardProps) {
    const metrics = useCareerMetrics([], trackedEvents);
    const { averageRating, feedbackCount, recommendationRate } = metrics.outcomeSignals;
    const formattedValue = averageRating !== null ? averageRating.toFixed(1) : '—';
    const summary = feedbackCount > 0
        ? `${feedbackCount} rated event${feedbackCount === 1 ? '' : 's'}${recommendationRate !== null ? ` · ${Math.round(recommendationRate)}% would recommend` : ''}`
        : 'Rate attended events to unlock outcome insights';

    return (
        <article className={styles.card}>
            <div className={styles.content}>
                <div className={styles.meta}>
                    <p className={styles.title}>Outcome Rating</p>
                    <div className={styles.valueRow}>
                        <p className={styles.value}>{formattedValue}</p>
                        {feedbackCount > 0 && (
                            <span className={`${styles.trend} ${styles.trendStable}`}>
                                <span>{feedbackCount} rated</span>
                            </span>
                        )}
                    </div>
                    <p className={styles.description}>{summary}</p>
                </div>

                <div className={styles.iconWrap}>
                    <ChartLineUpIcon className={styles.icon} weight="bold" />
                </div>
            </div>
        </article>
    );
}
