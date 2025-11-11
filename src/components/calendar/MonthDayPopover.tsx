'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Event, MultiDayEventInstance } from '@/types';
import { MonthInlineEventRow, getInlineAccent, formatInlineMeta, type InlineEvent } from './TechCalendarMonthView';
import '@/app/styles/month-day-popover.css';

interface MonthDayPopoverProps {
    events: (Event | MultiDayEventInstance)[];
    date: Date;
    isOpen: boolean;
    onClose: () => void;
    position?: { x: number; y: number };
    onEventSelect: (event: Event | MultiDayEventInstance) => void;
    onEventHover: (event: Event | MultiDayEventInstance, e: React.MouseEvent) => void;
    onEventLeave: () => void;
}

const MonthDayPopover: React.FC<MonthDayPopoverProps> = ({
    events,
    date,
    isOpen,
    onClose,
    position,
    onEventSelect,
    onEventHover,
    onEventLeave
}) => {
    const popoverRef = useRef<HTMLDivElement>(null);
    const [popoverPosition, setPopoverPosition] = useState<{ top: string; left: string }>({
        top: '0',
        left: '0'
    });

    // Handle click outside to close popover
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        // Handle ESC key
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    // Position the popover
    useEffect(() => {
        if (isOpen && popoverRef.current && position) {
            const rect = popoverRef.current.getBoundingClientRect();
            let top = position.y + 10; // Below the trigger button
            let left = position.x - rect.width / 2; // Center horizontally

            // Adjust if off-screen
            if (left < 10) left = 10;
            if (left + rect.width > window.innerWidth - 10) {
                left = window.innerWidth - rect.width - 10;
            }

            if (top + rect.height > window.innerHeight) {
                top = position.y - rect.height - 10; // Above the trigger button if too close to bottom
            }

            setPopoverPosition({
                top: `${top}px`,
                left: `${left}px`
            });
        }
    }, [isOpen, position]);

    if (!isOpen) return null;

    const dateStr = date.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });

    return (
        <div
            ref={popoverRef}
            className="month-day-popover"
            style={{
                position: 'fixed',
                top: popoverPosition.top,
                left: popoverPosition.left,
                zIndex: 1000
            }}
            role="dialog"
            aria-modal="true"
            aria-label={`Events for ${dateStr}`}
        >
            <div className="month-day-popover-header">
                <h3 className="month-day-popover-title">{dateStr}</h3>
                <button
                    className="month-day-popover-close"
                    onClick={onClose}
                    aria-label="Close"
                    type="button"
                >
                    ×
                </button>
            </div>

            <div className="month-day-popover-content">
                {events.length === 0 ? (
                    <div className="month-day-popover-empty">No events</div>
                ) : (
                    <div className="month-day-popover-events">
                        {events.map((event, index) => (
                            <div
                                key={`${event.id}-${index}`}
                                className="month-day-popover-event"
                            >
                                <MonthInlineEventRow
                                    event={event as InlineEvent}
                                    onSelect={() => {
                                        onEventLeave();
                                        onEventSelect(event);
                                        onClose();
                                    }}
                                    onHover={onEventHover}
                                    onLeave={onEventLeave}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MonthDayPopover;
