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
                className="flex items-center justify-center w-10 h-10 rounded-md bg-transparent hover:bg-white/[0.05] text-[#888888] hover:text-white transition-all"
                title="Bookmark Event"
            >
                <BookmarkSimple size={20} />
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
            className={`flex items-center justify-center w-10 h-10 rounded-md transition-all disabled:opacity-60 disabled:cursor-not-allowed ${eventIsBookmarked
                    ? 'bg-amber-600/20 text-amber-500 hover:bg-amber-600/30'
                    : 'bg-transparent hover:bg-white/[0.05] text-[#888888] hover:text-white'
                }`}
            aria-pressed={eventIsBookmarked}
            title={eventIsBookmarked ? 'Bookmarked' : 'Bookmark Event'}
        >
            <BookmarkSimple size={20} weight={eventIsBookmarked ? 'fill' : 'regular'} />
        </button>
    );
};

export default BookmarkEventButton;
