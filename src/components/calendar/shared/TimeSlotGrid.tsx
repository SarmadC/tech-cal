'use client';

import React from 'react';
import { Event } from '@/types';
import { TimeSlot } from './WeekTimeColumn';
import { WeekEventRenderer } from './WeekEventRenderer';

export interface TimeSlotGridProps {
    timeSlots: TimeSlot[];
    weekDays: Date[];
    eventsByDay: Map<number, Event[]>;
    startHour: number;
    endHour: number;
    onEventClick: (event: Event) => void;
    onEventHover: (event: Event, mouseEvent: React.MouseEvent) => void;
    onEventLeave: () => void;
    className?: string;
}

export const TimeSlotGrid: React.FC<TimeSlotGridProps> = ({
    timeSlots,
    weekDays,
    eventsByDay,
    startHour,
    endHour,
    onEventClick,
    onEventHover,
    onEventLeave,
    className = ''
}) => {
    // Calculate total rows needed: 2 per hour (30-minute slots)
    const totalRows = (endHour - startHour + 1) * 2;
    
    const gridColsStyle = { 
        gridTemplateColumns: `80px repeat(7, 1fr)`,
        gridTemplateRows: `repeat(${totalRows}, 30px)` // Same as day view: 30px per half-hour
    };

    return (
        <div className={`week-grid-container ${className}`} style={gridColsStyle}>
            {/* Render horizontal grid lines first (background) */}
            {Array.from({ length: totalRows }).map((_, i) => (
                <div 
                    key={`line-${i}`} 
                    className="week-grid-line" 
                    style={{ 
                        gridRow: i + 1,
                        gridColumn: '1 / -1' // Span all columns
                    }} 
                />
            ))}

            {/* Render time labels */}
            {timeSlots.map((timeSlot, index) => (
                <div 
                    key={timeSlot.hour} 
                    className="week-time-label"
                    style={{ 
                        gridColumn: 1,
                        gridRow: `${index * 2 + 1} / ${index * 2 + 3}` // Span 2 rows (1 hour)
                    }}
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
            
            {/* Render event cards for each day column */}
            {weekDays.map((day, dayIndex) => {
                const dayEvents = eventsByDay.get(dayIndex) || [];
                
                return (
                    <div 
                        key={`day-${dayIndex}`} 
                        className="week-day-column"
                        style={{
                            gridColumn: dayIndex + 2, // +2 because time column is first
                            gridRow: `1 / ${totalRows + 1}`, // Span all time rows
                            position: 'relative'
                        }}
                    >
                        <WeekEventRenderer
                            events={dayEvents}
                            dayIndex={dayIndex}
                            currentDay={day}
                            startHour={startHour}
                            endHour={endHour}
                            onEventClick={onEventClick}
                            onEventHover={onEventHover}
                            onEventLeave={onEventLeave}
                        />
                    </div>
                );
            })}
        </div>
    );
};