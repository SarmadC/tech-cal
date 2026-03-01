'use client';

import React, { memo } from 'react';
import Image from 'next/image';
import { Event, MultiDayEventInstance } from '@/types';
import { isEventPast } from '@/utils/dateUtils';
import { isParentMultiDayEvent } from '@/utils/multiDayEventUtils';
import NetworkAttendingBadge from '@/components/social/NetworkAttendingBadge';

interface MonthEventCardProps {
    event: Event | MultiDayEventInstance;
    onClick: () => void;
    onHover: (e: React.MouseEvent) => void;
    onLeave: () => void;
    className?: string;
    style?: React.CSSProperties;
}

import { getEventAccentColor } from '@/utils/calendarColorUtils';

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

const formatTimeLabel = (event: Event | MultiDayEventInstance) => {
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

    const hasMultiDay = isParentMultiDayEvent(event) && event.isMultiDay && event.endTime;

    if (hasMultiDay) {
        const end = new Date(event.endTime as string);
        if (!Number.isNaN(end.getTime())) {
            return formatDateRange(start, end);
        }
    }

    if (isParentMultiDayEvent(event) && event.eventPattern === 'all_day') {
        return 'All day';
    }

    const formatOptions: Intl.DateTimeFormatOptions = {
        hour: 'numeric',
        minute: '2-digit'
    };

    const startLabel = start.toLocaleTimeString(undefined, formatOptions);

    if (!event.endTime) {
        return startLabel;
    }

    const end = new Date(event.endTime);
    if (Number.isNaN(end.getTime()) || start.toDateString() !== end.toDateString()) {
        return startLabel;
    }

    const endLabel = end.toLocaleTimeString(undefined, formatOptions);
    return startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`;
};

const getDurationLabel = (event: Event | MultiDayEventInstance) => {
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

const MonthEventCardComponent: React.FC<MonthEventCardProps> = ({
    event,
    onClick,
    onHover,
    onLeave,
    className = '',
    style = {}
}) => {
    const accentColor = getEventAccentColor(event);
    const isPast = isEventPast(event.startTime, event.endTime);
    const timeLabelRaw = formatTimeLabel(event);
    const durationLabelRaw = getDurationLabel(event);

    const composedStyle: React.CSSProperties = {
        ...style,
        ['--event-accent-color' as string]: accentColor
    };

    const spanInfo =
        'isInstance' in event && event.isInstance && event.dayInfo && event.dayInfo.totalDays > 1
            ? {
                isFirst: event.dayInfo.isFirstDay,
                isLast: event.dayInfo.isLastDay,
                isSingle: event.dayInfo.isFirstDay && event.dayInfo.isLastDay
            }
            : null;

    const spanClasses: string[] = [];
    if (spanInfo) {
        if (spanInfo.isSingle) {
            spanClasses.push('month-event-card--span-single');
        } else {
            if (spanInfo.isFirst) spanClasses.push('month-event-card--span-start');
            if (!spanInfo.isFirst && !spanInfo.isLast) spanClasses.push('month-event-card--span-middle');
            if (spanInfo.isLast) spanClasses.push('month-event-card--span-end');
        }
    }

    const isMultiDayInstance =
        spanInfo !== null ||
        (isParentMultiDayEvent(event) && event.isMultiDay && !!event.endTime);

    const summaryLabelParts = [
        isMultiDayInstance ? '' : timeLabelRaw,
        isMultiDayInstance ? null : durationLabelRaw,
    ].filter((value): value is string => Boolean(value));
    const summaryLabel = summaryLabelParts.join(' · ');
    const networkAttendingCount = event.networkAttendingCount ?? 0;
    const networkSampleAvatars = event.networkSampleAvatars ?? [];

    const handleClick = (clickEvent: React.MouseEvent) => {
        clickEvent.stopPropagation();
        onLeave();
        onClick();
    };

    const handleKeyDown = (keyEvent: React.KeyboardEvent) => {
        if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
            keyEvent.preventDefault();
            onLeave();
            onClick();
        }
    };

    return (
        <div
            style={composedStyle}
            className={`month-event-card ${isPast ? 'month-event-card--past' : ''} ${spanClasses.join(' ')} ${className}`.trim()}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            onMouseEnter={onHover}
            onMouseLeave={onLeave}
            tabIndex={0}
            role="button"
            aria-label={`${event.title}${summaryLabel ? `, ${summaryLabel}` : ''}`}
        >
            <span className="month-event-card-accent" aria-hidden="true" />

            {/* Icon Lockup: Left Aligned */}
            {event.organization?.logo && (
                <span className="month-event-card-logo" style={{ marginRight: '6px', marginLeft: '2px' }}>
                    <Image
                        src={event.organization.logo}
                        alt={`${event.organization.name} logo`}
                        width={16}
                        height={16}
                        onError={(imageEvent) => {
                            imageEvent.currentTarget.style.visibility = 'hidden';
                        }}
                    />
                </span>
            )}

            <span className="month-event-card-label" style={{ padding: '2px 0' }}>{event.title}</span>
            {networkAttendingCount > 0 && (
                <NetworkAttendingBadge
                    eventId={event.id}
                    telemetrySurface="calendar_month_card"
                    count={networkAttendingCount}
                    sampleAvatars={networkSampleAvatars}
                    compact
                    className="ml-2 hidden md:inline-flex"
                />
            )}

            {/* Redundant pills removed for cleaner look as per user request */}
        </div>
    );
};

export const MonthEventCard = memo(MonthEventCardComponent, (prevProps, nextProps) => {
    return (
        prevProps.event.id === nextProps.event.id &&
        prevProps.event.title === nextProps.event.title &&
        prevProps.onClick === nextProps.onClick &&
        prevProps.onHover === nextProps.onHover &&
        prevProps.onLeave === nextProps.onLeave &&
        prevProps.className === nextProps.className
    );
});

MonthEventCard.displayName = 'MonthEventCard';
