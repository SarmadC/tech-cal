'use client';

import Link from 'next/link';
import { ChatTeardropDots } from '@phosphor-icons/react';
import { formatRelativeTime } from '@/utils/dateUtils';

interface EventRoomBannerProps {
  eventId: string;
  threadCount: number;
  lastActivityAt: string | null;
  onStartThread: () => void;
}

export default function EventRoomBanner({
  eventId,
  threadCount,
  lastActivityAt,
  onStartThread,
}: EventRoomBannerProps) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 border border-[#454652] rounded-[6px] bg-[#1f2021]">
      <ChatTeardropDots size={18} className="flex-shrink-0 text-[#bdc2ff]" weight="fill" />

      <div className="flex-1 min-w-0">
        <span className="text-[13px] font-medium text-[#e3e2e3]">Event Room</span>
        <span className="ml-2 text-[11px] text-[#908f9e]">
          {threadCount} thread{threadCount !== 1 ? 's' : ''}
          {lastActivityAt && (
            <> · active {formatRelativeTime(lastActivityAt)}</>
          )}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={onStartThread}
          className="h-7 px-3 text-[12px] text-[#c6c5d5] border border-[#454652] rounded-[4px] hover:border-[#bdc2ff] hover:text-[#bdc2ff] transition-colors"
        >
          New thread
        </button>
        <Link
          href={`/event/${eventId}/room`}
          className="h-7 px-3 text-[12px] font-medium rounded-[4px] bg-[#bdc2ff] text-[#121f8b] hover:bg-[#dfe0ff] transition-colors flex items-center"
        >
          View Room →
        </Link>
      </div>
    </div>
  );
}
