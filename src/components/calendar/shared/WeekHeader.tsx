'use client';

import React from 'react';
import { formatDayHeader } from '@/utils/eventViewUtils';
import { isSameDay } from '@/utils/dateUtils';

export interface WeekHeaderProps {
    weekDays: Date[];
    className?: string;
}

export const WeekHeader: React.FC<WeekHeaderProps> = ({
    weekDays,
    className = ''
}) => {
    const today = new Date();

    // Debug logging
    console.log('[WeekHeader] Rendering with weekDays:', weekDays);
    console.log('[WeekHeader] weekDays length:', weekDays.length);

    return (
        <div
            className={`week-header ${className}`}
            style={{
                display: 'grid',
                gridTemplateColumns: '80px repeat(7, 1fr)',
                background: 'var(--background-main, #0a0a0b)',
                borderBottom: '2px solid var(--border-default, rgba(255, 255, 255, 0.08))',
                position: 'sticky',
                top: 0,
                zIndex: 20,
                minWidth: '1200px'
            }}
        >
            {/* Time column header */}
            <div className="week-header-cell time-header">
                <div className="font-medium text-gray-500">Time</div>
            </div>

            {/* Day headers */}
            {weekDays.map((day, index) => {
                const { dayNumber, dayName } = formatDayHeader(day);
                const isToday = isSameDay(day, today);

                return (
                    <div
                        key={index}
                        className={`week-header-cell day-header ${isToday ? 'today' : ''}`}
                    >
                        <div className="day-name">{dayName}</div>
                        <div className="day-number">{dayNumber}</div>
                    </div>
                );
            })}
        </div>
    );
};