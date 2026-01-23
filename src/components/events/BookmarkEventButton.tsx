'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BookmarkSimple } from '@phosphor-icons/react';
import { useAuth } from '@/contexts';
import { useEventEngagement } from '@/hooks/useEventEngagement';

interface BookmarkEventButtonProps {
    eventId: string;
    event?: Record<string, unknown>;
    loginRedirect: string;
}

const BookmarkEventButton = ({ eventId, event, loginRedirect }: BookmarkEventButtonProps) => {
    const { user } = useAuth();
    const { isBookmarked, toggleBookmark } = useEventEngagement();
    const [isBusy, setIsBusy] = useState(false);

    const eventIsBookmarked = isBookmarked(eventId);

    if (!user) {
        return (
            <Link
                href={`/login?redirect=${encodeURIComponent(loginRedirect)}`}
                className="flex w-full items-center justify-center h-10 bg-foreground-primary hover:bg-foreground-secondary text-background-main font-medium text-[13px] rounded-md transition-colors gap-2"
            >
                <BookmarkSimple className="h-4 w-4" />
                Bookmark Event
            </Link>
        );
    }

    const handleBookmark = async () => {
        if (isBusy) return;
        setIsBusy(true);
        try {
            await toggleBookmark(eventId, event);
        } finally {
            setIsBusy(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handleBookmark}
            disabled={isBusy}
            className="flex w-full items-center justify-center h-10 bg-foreground-primary hover:bg-foreground-secondary text-background-main font-medium text-[13px] rounded-md transition-colors gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            aria-pressed={eventIsBookmarked}
        >
            <BookmarkSimple className="h-4 w-4" weight={eventIsBookmarked ? 'fill' : 'regular'} />
            {eventIsBookmarked ? 'Bookmarked' : 'Bookmark Event'}
        </button>
    );
};

export default BookmarkEventButton;
