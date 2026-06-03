'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChatCircle } from '@phosphor-icons/react/ssr';
import type { MobileCommunityRoomThread } from '@kurecal/domain';
import { formatRelativeTime } from '@/utils/dateUtils';
import EventDiscussionCompose from './EventDiscussionCompose';
import ThreadAuthorAvatar from './ThreadAuthorAvatar';

interface EventRoomPageProps {
  eventId: string;
  eventTitle: string;
  initialThreads: MobileCommunityRoomThread[];
  initialTotalCount: number;
  nextCursor: string | null;
}

export default function EventRoomPage({
  eventId,
  eventTitle,
  initialThreads,
  initialTotalCount,
  nextCursor: initialCursor,
}: EventRoomPageProps) {
  const [threads, setThreads] = useState(initialThreads);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [cursor, setCursor] = useState(initialCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showCompose, setShowCompose] = useState(false);

  function handleCreated(thread: MobileCommunityRoomThread, newCount: number) {
    setShowCompose(false);
    setThreads((prev) => {
      const exists = prev.some((t) => t.id === thread.id);
      return exists ? prev : [thread, ...prev];
    });
    setTotalCount(newCount);
  }

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/events/${eventId}/threads?cursor=${encodeURIComponent(cursor)}`,
        { credentials: 'same-origin' },
      );
      const json = await res.json();
      if (json.success) {
        setThreads((prev) => [...prev, ...(json.data.threads ?? [])]);
        setCursor(json.data.nextCursor ?? null);
      }
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-[#0d0e0f]">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href={`/event/${eventId}`}
            className="text-[#908f9e] hover:text-[#c6c5d5] transition-colors flex items-center gap-1 text-[13px]"
          >
            <ArrowLeft size={14} />
            Back
          </Link>
          <span className="text-[#454652]">/</span>
          <h1 className="text-[13px] text-[#c6c5d5] truncate">{eventTitle}</h1>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-[16px] font-semibold text-[#e3e2e3]">Event Room</span>
            <span className="ml-2 text-[12px] text-[#908f9e]">
              {totalCount} thread{totalCount !== 1 ? 's' : ''}
            </span>
          </div>
          {!showCompose && (
            <button
              type="button"
              onClick={() => setShowCompose(true)}
              className="h-7 px-3 text-[12px] font-medium rounded-[4px] bg-[#bdc2ff] text-[#121f8b] hover:bg-[#dfe0ff] transition-colors"
            >
              New Thread
            </button>
          )}
        </div>

        {/* Compose */}
        {showCompose && (
          <div className="mb-4">
            <EventDiscussionCompose
              eventId={eventId}
              onCreated={handleCreated}
              onCancel={() => setShowCompose(false)}
            />
          </div>
        )}

        {/* Thread list */}
        {threads.length === 0 && !showCompose ? (
          <div className="py-8 text-center">
            <p className="text-[13px] text-[#908f9e] mb-3">No threads yet.</p>
            <button
              type="button"
              onClick={() => setShowCompose(true)}
              className="text-[13px] text-[#bdc2ff] hover:text-[#dfe0ff] transition-colors"
            >
              Start the first discussion →
            </button>
          </div>
        ) : (
          <div className="border border-[#454652] rounded-[6px] divide-y divide-[#454652] overflow-hidden">
            {threads.map((thread) => (
              <div key={thread.id} id={thread.id} className="flex items-start gap-3 px-3 py-3 hover:bg-[#1f2021] transition-colors scroll-mt-4">
                <ThreadAuthorAvatar
                  avatarUrl={thread.author.avatarUrl}
                  fullName={thread.author.fullName}
                  username={thread.author.username}
                  size="md"
                  className="mt-0.5"
                />

                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[#e3e2e3] leading-snug">
                    {thread.title}
                  </p>
                  {thread.body && (
                    <p className="text-[12px] text-[#908f9e] mt-0.5 line-clamp-2 leading-snug">
                      {thread.body}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[11px] text-[#908f9e]">
                      {thread.author.fullName ?? thread.author.username}
                    </span>
                    <span className="text-[11px] text-[#454652]">
                      {formatRelativeTime(thread.createdAt)}
                    </span>
                    {thread.commentCount > 0 && (
                      <span className="flex items-center gap-1 text-[11px] text-[#908f9e]">
                        <ChatCircle size={11} />
                        {thread.commentCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load more */}
        {cursor && (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="text-[12px] text-[#bdc2ff] hover:text-[#dfe0ff] transition-colors disabled:opacity-40"
            >
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
