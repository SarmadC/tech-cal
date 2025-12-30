// src/components/calendar/shared/EventOverflowPopover.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import { Event, MultiDayEventInstance } from '@/types';
import { formatTime } from '@/utils/dateUtils';
import { getCategoryColor } from '@/utils/eventUtils';
import { MaterialIcon } from '@/components/ui/Icon';

interface EventOverflowPopoverProps {
    events: (Event | MultiDayEventInstance)[];
    anchorEl: HTMLElement;
    onClose: () => void;
    onEventClick: (event: Event | MultiDayEventInstance) => void;
}

export const EventOverflowPopover: React.FC<EventOverflowPopoverProps> = ({
    events,
    anchorEl,
    onClose,
    onEventClick,
}) => {
    const popoverRef = useRef<HTMLDivElement>(null);

    // Position the popover relative to the anchor element
    useEffect(() => {
        if (!popoverRef.current || !anchorEl) return;

        const anchorRect = anchorEl.getBoundingClientRect();
        const popover = popoverRef.current;

        // Position to the right of the anchor, or left if not enough space
        const spaceRight = window.innerWidth - anchorRect.right;
        const spaceLeft = anchorRect.left;

        if (spaceRight > 300) {
            popover.style.left = `${anchorRect.right + 8}px`;
        } else if (spaceLeft > 300) {
            popover.style.right = `${window.innerWidth - anchorRect.left + 8}px`;
        } else {
            // Center on screen if no space on either side
            popover.style.left = '50%';
            popover.style.transform = 'translateX(-50%)';
        }

        popover.style.top = `${anchorRect.top}px`;
    }, [anchorEl]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    // Close on Escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    return (
        <div
            ref={popoverRef}
            className="event-overflow-popover"
            role="dialog"
            aria-label="Additional events"
        >
            <div className="popover-header">
                <span className="popover-title">{events.length} Events</span>
                <button
                    className="popover-close"
                    onClick={onClose}
                    aria-label="Close"
                >
                    <MaterialIcon name="close" size={16} />
                </button>
            </div>

            <div className="popover-content">
                {events.map((event, index) => {
                    const categoryColor = getCategoryColor(event);

                    return (
                        <div
                            key={event.id}
                            className="popover-event-item"
                            onClick={() => {
                                onEventClick(event);
                                onClose();
                            }}
                            style={{
                                borderLeft: `3px solid ${categoryColor}`,
                            }}
                        >
                            <div className="popover-event-time">
                                {formatTime(event.startTime)}
                            </div>
                            <div className="popover-event-title">{event.title}</div>
                            {event.location && (
                                <div className="popover-event-location">
                                    <MaterialIcon name="location" size={12} />
                                    {event.location}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
