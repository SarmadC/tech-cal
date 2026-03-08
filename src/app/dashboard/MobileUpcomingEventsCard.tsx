'use client';

import { CalendarBlankIcon, PlusIcon } from '@phosphor-icons/react';
import { format } from 'date-fns';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import type { CareerProfile, Event, TrackedEventRecord } from '@/types';
import { MobileDashboardCard } from './MobileDashboardCard';
import styles from './MobileUpcomingEventsCard.module.css';

interface MobileUpcomingEventsCardProps {
    trackedEvents: TrackedEventRecord[];
    upcomingEvents: Event[];
    careerProfile: CareerProfile | null;
    onSelectEvent: (event: Event) => void;
}

export function MobileUpcomingEventsCard({
    trackedEvents,
    upcomingEvents,
    careerProfile,
    onSelectEvent,
}: MobileUpcomingEventsCardProps) {
    const metrics = useDashboardMetrics({
        trackedEvents,
        upcomingEvents,
        careerProfile,
    });

    const displayEvents = metrics.followUpReminders.slice(0, 4);
    const showPlaceholder = displayEvents.length === 1;

    return (
        <MobileDashboardCard className={styles.card}>
            <div className={styles.header}>
                <div className={styles.titleWrap}>
                    <div className={styles.titleRow}>
                        <h3 className={styles.title}>Upcoming Commitments</h3>
                    </div>
                    <p className={styles.subtitle}>RSVP&apos;d events you need to prepare for</p>
                </div>

            </div>

            <div className={styles.list}>
                {displayEvents.length > 0 ? (
                    <>
                        {displayEvents.map(({ event, daysUntil }) => {
                            const isUrgent = daysUntil <= 7;
                            const isFar = daysUntil > 30;

                            return (
                                <button
                                    key={event.id}
                                    type="button"
                                    className={styles.eventRow}
                                    onClick={() => onSelectEvent(event)}
                                >
                                    <div className={styles.dateBlock}>
                                        <span className={styles.date}>{format(new Date(event.startTime), 'MMM d')}</span>
                                        <span className={styles.time}>{format(new Date(event.startTime), 'h:mm a')}</span>
                                    </div>

                                    <div className={styles.meta}>
                                        <span className={styles.eventTitle}>{event.title}</span>
                                        {event.location && <span className={styles.location}>{event.location}</span>}
                                    </div>

                                    <div className={styles.badgeWrap}>
                                        <span
                                            className={`${styles.badge} ${isUrgent ? styles.badgeUrgent : ''} ${isFar ? styles.badgeFar : ''}`}
                                        >
                                            {daysUntil === 0 ? 'Today' : `${daysUntil}d`}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}

                        {showPlaceholder && (
                            <div className={styles.openSlot}>
                                <div className={styles.openSlotInner}>
                                    <PlusIcon className={styles.openSlotIcon} weight="bold" />
                                    <span className={styles.openSlotText}>Open Slot</span>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className={styles.emptyState}>
                        <CalendarBlankIcon className={styles.emptyIcon} weight="thin" />
                        <p className={styles.emptyText}>No upcoming commitments</p>
                    </div>
                )}
            </div>
        </MobileDashboardCard>
    );
}
