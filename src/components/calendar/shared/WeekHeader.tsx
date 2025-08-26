'use client';

import React from 'react';
import { formatDayHeader } from '@/utils/eventViewUtils';

export interface WeekHeaderProps {
    weekDays: Date[];
    className?: string;
}

export const WeekHeader: React.FC<WeekHeaderProps> = ({ 
    weekDays, 
    className = '' 
}) => {
    const today = new Date();
    
    return (
        <div className={`week-header ${className}`}>
            {/* Time column header */}
            <div className="week-header-cell time-header">
                <div className="font-medium text-gray-500">Time</div>
            </div>
            
            {/* Day headers */}
            {weekDays.map((day, index) => {
                const { dayNumber, dayName } = formatDayHeader(day);
                const isToday = day.toDateString() === today.toDateString();
                
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