'use client';

import React from 'react';

export interface TimeSlot {
    hour: number;
    time24: string;
    time12: string;
}

export interface WeekTimeColumnProps {
    timeSlots: TimeSlot[];
    className?: string;
}

export const WeekTimeColumn: React.FC<WeekTimeColumnProps> = ({ 
    timeSlots, 
    className = '' 
}) => {
    return (
        <>
            {timeSlots.map((timeSlot) => (
                <div 
                    key={timeSlot.hour} 
                    className={`week-time-label ${className}`}
                >
                    <div className="time-content">
                        <div className="font-medium time-hour">
                            {timeSlot.time12.split(' ')[0]}
                        </div>
                        <div className="time-period">
                            {timeSlot.time12.split(' ')[1]}
                        </div>
                    </div>
                </div>
            ))}
        </>
    );
};