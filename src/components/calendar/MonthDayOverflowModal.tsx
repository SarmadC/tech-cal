'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Event, MultiDayEventInstance } from '@/types';
import { isParentMultiDayEvent } from '@/utils/multiDayEventUtils';

interface MonthDayOverflowModalProps {
    date: Date;
    events: (Event | MultiDayEventInstance)[];
    onClose: () => void;
    onSelectEvent?: (event: Event | MultiDayEventInstance) => void;
}

const formatDateRange = (start: Date, end: Date) => {
    const sameYear = start.getFullYear() === end.getFullYear();
    const sameMonth = sameYear && start.getMonth() === end.getMonth();

    const startFormatter = new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        ...(sameYear ? {} : { year: 'numeric' })
    });

    const endFormatter = new Intl.DateTimeFormat(undefined, {
        month: sameMonth ? undefined : 'short',
        day: 'numeric',
        ...(sameYear ? {} : { year: 'numeric' })
    });

    const startLabel = startFormatter.format(start);
    const endLabel = endFormatter.format(end);
    return startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`;
};

const formatSingleDate = (date: Date) =>
    new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);

const formatTimeRange = (event: Event | MultiDayEventInstance) => {
    const start = new Date(event.startTime);
    if (Number.isNaN(start.getTime())) {
        return '';
    }

    if ('isInstance' in event && event.isInstance && event.dayInfo && event.multiDayStart && event.multiDayEnd) {
        const originalStart = new Date(event.multiDayStart);
        const originalEnd = new Date(event.multiDayEnd);

        if (event.dayInfo.isFirstDay) {
            return formatDateRange(originalStart, originalEnd);
        }

        if (event.dayInfo.isLastDay) {
            return `Ends ${formatSingleDate(originalEnd)}`;
        }

        return `Continues • Ends ${formatSingleDate(originalEnd)}`;
    }

    const isMultiDayParent = isParentMultiDayEvent(event) && event.isMultiDay && event.endTime;

    if (isMultiDayParent) {
        const end = new Date(event.endTime as string);
        if (!Number.isNaN(end.getTime())) {
            return formatDateRange(start, end);
        }
    }

    if (isParentMultiDayEvent(event) && event.eventPattern === 'all_day') {
        return 'All day';
    }

    const end = event.endTime ? new Date(event.endTime) : null;
    const formatOptions: Intl.DateTimeFormatOptions = {
        hour: 'numeric',
        minute: '2-digit'
    };
    const startLabel = start.toLocaleTimeString(undefined, formatOptions);

    if (!end || Number.isNaN(end.getTime()) || start.toDateString() !== end.toDateString()) {
        return startLabel;
    }

    const endLabel = end.toLocaleTimeString(undefined, formatOptions);
    return startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`;
};

const formatDuration = (event: Event | MultiDayEventInstance) => {
    if ('isInstance' in event && event.isInstance && event.dayInfo) {
        const { totalDays, isFirstDay, isLastDay } = event.dayInfo;
        if (totalDays <= 1) return null;
        if (isFirstDay) return `${totalDays} days`;
        if (isLastDay) return 'Final day';
        return null;
    }

    if (isParentMultiDayEvent(event) && event.isMultiDay && event.endTime) {
        const start = new Date(event.startTime);
        const end = new Date(event.endTime);
        if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
            const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            if (diff > 1) {
                return `${diff} days`;
            }
        }
    }

    if (isParentMultiDayEvent(event) && event.eventPattern === 'all_day') {
        return 'All day';
    }

    return null;
};

const MonthDayOverflowModal: React.FC<MonthDayOverflowModalProps> = ({
    date,
    events,
    onClose,
    onSelectEvent
}) => {
    const [mounted, setMounted] = useState(false);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const titleId = useMemo(() => `month-day-events-${date.getTime()}`, [date]);
    const sortedEvents = useMemo(
        () =>
            [...events].sort(
                (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
            ),
        [events]
    );

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    useEffect(() => {
        const previouslyFocused = document.activeElement as HTMLElement | null;
        closeButtonRef.current?.focus();

        return () => previouslyFocused?.focus();
    }, []);

    const formattedDate = date.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });

    if (!mounted) {
        return null;
    }

    return createPortal(
        <div className="month-overflow-backdrop" onClick={onClose}>
            <div
                className="month-overflow-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                onClick={(event) => event.stopPropagation()}
            >
                <div className="month-overflow-header">
                    <h2 id={titleId} className="month-overflow-title">
                        {formattedDate}
                    </h2>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        className="month-overflow-close"
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>

                <ul className="month-overflow-event-list">
                    {sortedEvents.map((event) => {
                        const accentColor =
                            event.category?.color || event.color || 'var(--accent-primary)';
                        const timeLabel = formatTimeRange(event);
                        const durationLabel = formatDuration(event);

                        return (
                            <li key={event.id} className="month-overflow-event-item">
                                <button
                                    type="button"
                                    className="month-overflow-event-button"
                                    onClick={() => {
                                        onSelectEvent?.(event);
                                        onClose();
                                    }}
                                >
                                    <span
                                        className="month-overflow-event-accent"
                                        style={{ backgroundColor: accentColor }}
                                        aria-hidden="true"
                                    />
                                    <span className="month-overflow-event-content">
                                        <span className="month-overflow-event-title">
                                            {event.title}
                                        </span>
                                        <span className="month-overflow-event-meta">
                                            {timeLabel && (
                                                <span className="month-overflow-event-time">
                                                    {timeLabel}
                                                </span>
                                            )}
                                            {durationLabel && (
                                                <span className="month-overflow-event-duration">
                                                    {durationLabel}
                                                </span>
                                            )}
                                            {event.category?.name && (
                                                <span className="month-overflow-event-category">
                                                    {event.category.name}
                                                </span>
                                            )}
                                        </span>
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>,
        document.body
    );
};

export default MonthDayOverflowModal;

