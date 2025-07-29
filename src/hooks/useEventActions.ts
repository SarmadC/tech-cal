// src/hooks/useEventActions.ts
'use client';

import { useMemo, useState } from 'react';
import { AppEvent } from '@/types';
import { formatToUTC } from '@/lib/calendarUtils';

/**
 * A custom hook to manage event-related actions like sharing and adding to external calendars.
 * @param event - The event object to perform actions on.
 */
export function useEventActions(event: AppEvent) {
    // State to control the visibility of the "Link Copied!" confirmation message.
    const [showCopiedBanner, setShowCopiedBanner] = useState(false);

    /**
     * Copies a shareable link for the event to the user's clipboard.
     */
    const handleShare = () => {
        const link = `${window.location.origin}/event/${event.id}`;
        navigator.clipboard.writeText(link);
        setShowCopiedBanner(true);
        // Hide the banner after 2.5 seconds
        setTimeout(() => setShowCopiedBanner(false), 2500);
    };

    /**
     * Generates a "Add to Google Calendar" link.
     * This is wrapped in useMemo to prevent recalculating the URL on every render.
     */
    const googleCalendarLink = useMemo(() => {
        const utcStartTime = formatToUTC(event.startTime);
        // If no end time, default to a 1-hour duration for the calendar event.
        const utcEndTime = formatToUTC(event.endTime || new Date(new Date(event.startTime).getTime() + 60 * 60 * 1000));

        const url = new URL('https://www.google.com/calendar/render');
        url.searchParams.set('action', 'TEMPLATE');
        url.searchParams.set('text', event.title);
        url.searchParams.set('dates', `${utcStartTime}/${utcEndTime}`);
        url.searchParams.set('details', event.description);
        url.searchParams.set('location', event.location);
        return url.href;
    }, [event]);

    /**
     * Generates and triggers the download of an .ics file for other calendar apps (like Outlook, Apple Calendar).
     */
    const handleIcsDownload = () => {
        const utcStartTime = formatToUTC(event.startTime);
        const utcEndTime = formatToUTC(event.endTime || new Date(new Date(event.startTime).getTime() + 60 * 60 * 1000));

        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//KureCal//EN',
            'BEGIN:VEVENT',
            `UID:${event.id}@kurecal.app`,
            `DTSTAMP:${formatToUTC(new Date())}`,
            `DTSTART:${utcStartTime}`,
            `DTEND:${utcEndTime}`,
            `SUMMARY:${event.title}`,
            `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`, // Ensure newlines are escaped
            `LOCATION:${event.location}`,
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n');

        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Return all the values and functions that the component will need.
    return { handleShare, googleCalendarLink, handleIcsDownload, showCopiedBanner };
}