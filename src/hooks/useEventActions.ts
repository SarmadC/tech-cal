// src/hooks/useEventActions.ts
'use client';

import { useMemo } from 'react';
import { toast } from 'sonner';
import { AppEvent } from '@/types';
import { formatToUTC } from '@/lib/calendarUtils';

/**
 * A custom hook to manage event-related actions like sharing and adding to external calendars.
 * @param event - The event object to perform actions on.
 */
export function useEventActions(event: AppEvent) {
    /**
     * Copies a shareable link for the event to the user's clipboard and shows a confirmation toast.
     */
    const handleShare = () => {
        // A placeholder link, as you don't have a dedicated `/event/[id]` page yet.
        // When you build that page, this link will work correctly.
        const link = `${window.location.origin}/calendar?eventId=${event.id}`; 
        
        navigator.clipboard.writeText(link)
            .then(() => {
                toast.success('Share link copied to clipboard!');
            })
            .catch(err => {
                console.error('Failed to copy text: ', err);
                toast.error('Could not copy link to clipboard.');
            });
    };

    /**
     * Generates a "Add to Google Calendar" link.
     */
    const googleCalendarLink = useMemo(() => {
        const utcStartTime = formatToUTC(event.startTime);
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
     * Generates and triggers the download of an .ics file for other calendar apps.
     */
    const handleIcsDownload = () => {
        try {
            const utcStartTime = formatToUTC(event.startTime);
            const utcEndTime = formatToUTC(event.endTime || new Date(new Date(event.startTime).getTime() + 60 * 60 * 1000));
    
            const icsContent = [
                'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//KureCal//EN', 'BEGIN:VEVENT',
                `UID:${event.id}@kurecal.app`, `DTSTAMP:${formatToUTC(new Date())}`,
                `DTSTART:${utcStartTime}`, `DTEND:${utcEndTime}`, `SUMMARY:${event.title}`,
                `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`, `LOCATION:${event.location}`,
                'END:VEVENT', 'END:VCALENDAR'
            ].join('\r\n');
    
            const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            toast.success('Calendar file (.ics) download started.');

        } catch (error) {
            console.error("Failed to generate .ics file:", error);
            toast.error("Could not create calendar file.");
        }
    };


    return { handleShare, googleCalendarLink, handleIcsDownload };
}