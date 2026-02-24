'use client';

import { useEffect } from 'react';
import { useEventEngagement } from '@/hooks/useEventEngagement';
import { useAuth } from '@/contexts';
import { useRouter } from 'next/navigation';

interface PublicEventShortcutsProps {
    eventId: string;
    slug: string;
    registrationUrl?: string | null;
    eventData?: {
        id: string;
        title: string;
        startTime: string;
        location: string | null;
        eventType: string | null;
        organizer: string | null;
    };
}

/**
 * PublicEventShortcuts handles global keyboard shortcuts for the event page.
 * 'R' - Open registration website
 * 'A' - Toggle attending status
 * 'B' - Toggle bookmark status
 */
export default function PublicEventShortcuts({
    eventId,
    slug,
    registrationUrl,
    eventData
}: PublicEventShortcutsProps) {
    const { user } = useAuth();
    const router = useRouter();
    const { getAttendanceStatus, setAttendanceStatus, toggleBookmark } = useEventEngagement();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in an input, textarea, or contentEditable element
            const activeElement = document.activeElement;
            const isTyping =
                activeElement?.tagName === 'INPUT' ||
                activeElement?.tagName === 'TEXTAREA' ||
                (activeElement as HTMLElement)?.isContentEditable;

            if (isTyping) return;

            // Only trigger for simple key presses (no Cmd/Ctrl/Alt/Shift)
            if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;

            const key = e.key.toLowerCase();

            if (key === 'r') {
                if (registrationUrl) {
                    window.open(registrationUrl, '_blank', 'noopener,noreferrer');
                }
            } else if (key === 'a') {
                if (!user) {
                    router.push(`/login?redirect=${encodeURIComponent(`/events/${slug}`)}`);
                    return;
                }
                const currentStatus = getAttendanceStatus(eventId);
                const newStatus = currentStatus === 'attending' ? null : 'attending';
                setAttendanceStatus(eventId, newStatus);
            } else if (key === 'b') {
                if (!user) {
                    router.push(`/login?redirect=${encodeURIComponent(`/events/${slug}`)}`);
                    return;
                }
                toggleBookmark(eventId, eventData);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [eventId, slug, registrationUrl, eventData, user, getAttendanceStatus, setAttendanceStatus, toggleBookmark, router]);

    return null;
}
