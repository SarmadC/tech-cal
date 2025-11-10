'use client';

import React, { memo } from 'react';
import Image from 'next/image';
import { Event, MultiDayEvent, MultiDayEventInstance } from '@/types';
import { isEventPast } from '@/utils/dateUtils';

interface MonthEventCardProps {
    event: Event | MultiDayEventInstance;
    onClick: () => void;
    onHover: (e: React.MouseEvent) => void;
    onLeave: () => void;
    className?: string;
    style?: React.CSSProperties;
}

const FALLBACK_ACCENT = 'var(--accent-primary)';
const FALLBACK_SURFACE = 'rgba(148, 163, 184, 0.14)';
const FALLBACK_SURFACE_HOVER = 'rgba(148, 163, 184, 0.24)';

const hexToRgba = (hex: string, alpha: number): string | null => {
    if (!hex.startsWith('#')) {
        return null;
    }

    const normalized = hex.length === 4
        ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
        : hex;

    if (normalized.length !== 7) {
        return null;
    }

    const r = parseInt(normalized.slice(1, 3), 16);
    const g = parseInt(normalized.slice(3, 5), 16);
    const b = parseInt(normalized.slice(5, 7), 16);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const getCategoryColor = (event: Event | MultiDayEventInstance) => {
    if (event.category?.color) return event.category.color;
    if (event.color) return event.color;

    const categoryName = event.category?.name?.toLowerCase();

    switch (categoryName) {
        case 'tech summit':
        case 'summit':
            return '#3b82f6';
        case 'workshop':
            return '#8b5cf6';
        case 'networking':
            return '#10b981';
        case 'conference':
            return '#0ea5e9';
        case 'webinar':
            return '#f97316';
        case 'startup':
            return '#ec4899';
        case 'trade show':
            return '#6366f1';
        case 'product launch':
            return '#f59e0b';
        case 'training':
            return '#14b8a6';
        default:
            return FALLBACK_ACCENT;
    }
};

const getAccentSurfaces = (color: string) => {
    const surface = hexToRgba(color, 0.18) ?? FALLBACK_SURFACE;
    const hover = hexToRgba(color, 0.28) ?? FALLBACK_SURFACE_HOVER;

    return { surface, hover };
};

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

    const hasMultiDay =
        'isMultiDay' in event && (event as MultiDayEvent).isMultiDay && event.endTime;

    if (hasMultiDay) {
        const end = new Date(event.endTime as string);
        if (!Number.isNaN(end.getTime())) {
            return formatDateRange(start, end);
        }
    }

    const eventPattern = 'eventPattern' in event ? (event as MultiDayEvent).eventPattern : undefined;
    if (eventPattern === 'all_day') {
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

    if ('isMultiDay' in event && (event as MultiDayEvent).isMultiDay && event.endTime) {
        const start = new Date(event.startTime);
        const end = new Date(event.endTime);

        if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
            const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            if (diff > 1) {
                return `${diff} days`;
            }
        }
    }

    const eventPattern = 'eventPattern' in event ? (event as MultiDayEvent).eventPattern : undefined;
    if (eventPattern === 'all_day') {
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
    const accentColor = getCategoryColor(event);
    const { surface, hover } = getAccentSurfaces(accentColor);
    const isPast = isEventPast(event.startTime, event.endTime);
    const timeLabelRaw = formatTimeLabel(event);
    const durationLabelRaw = getDurationLabel(event);

    const composedStyle: React.CSSProperties = {
        ...style,
        ['--event-accent-color' as string]: accentColor,
        ['--event-accent-surface' as string]: surface,
        ['--event-accent-surface-hover' as string]: hover
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
        ('isMultiDay' in event && (event as MultiDayEvent).isMultiDay && !!event.endTime);
    const isMultiDayFirstDay = spanInfo ? spanInfo.isFirst : !('isInstance' in event);

    const timeLabel = isMultiDayInstance ? '' : timeLabelRaw;
    const durationLabel = isMultiDayInstance ? null : durationLabelRaw;
    const showCategory = event.category?.name && (!isMultiDayInstance || isMultiDayFirstDay);
    const hasMeta = Boolean(timeLabel) || Boolean(durationLabel) || Boolean(showCategory);

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
            aria-label={`${event.title}${timeLabel ? `, ${timeLabel}` : ''}${durationLabel ? `, ${durationLabel}` : ''}${showCategory ? `, ${event.category!.name}` : ''}`}
        >
            <span className="month-event-card-accent" aria-hidden="true" />
            <span className="month-event-card-label">{event.title}</span>

            {hasMeta && (
                <span className="month-event-card-meta">
                    {timeLabel && (
                        <span className="month-event-card-meta-text">{timeLabel}</span>
                    )}
                    {durationLabel && (
                        <span className="month-event-card-pill">{durationLabel}</span>
                    )}
                    {showCategory && (
                        <span className="month-event-card-pill month-event-card-pill--category">
                            {event.category!.name}
                        </span>
                    )}
                </span>
            )}

            {event.organization?.logo && (
                <span className="month-event-card-logo">
                    <Image
                        src={event.organization.logo}
                        alt={`${event.organization.name} logo`}
                        width={20}
                        height={20}
                        onError={(imageEvent) => {
                            imageEvent.currentTarget.style.visibility = 'hidden';
                        }}
                    />
                </span>
            )}
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
