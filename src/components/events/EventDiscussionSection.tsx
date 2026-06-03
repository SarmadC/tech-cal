'use client';

import { useCallback, useEffect, useState } from 'react';
import type { MobileCommunityRoomThread } from '@kurecal/domain';
import EventDiscussionCompose from './EventDiscussionCompose';
import EventThreadPreviewList from './EventThreadPreviewList';
import EventRoomBanner from './EventRoomBanner';

const ROOM_THRESHOLD = 5;

interface EventDiscussionSectionProps {
  eventId: string;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; threads: MobileCommunityRoomThread[]; totalCount: number };

export default function EventDiscussionSection({ eventId }: EventDiscussionSectionProps) {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  const [showCompose, setShowCompose] = useState(false);

  const load = useCallback(() => {
    setLoadState({ status: 'loading' });
    fetch(`/api/events/${eventId}/threads`, { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setLoadState({
            status: 'loaded',
            threads: json.data.threads ?? [],
            totalCount: json.data.totalCount ?? 0,
          });
        } else {
          setLoadState({ status: 'error' });
        }
      })
      .catch(() => setLoadState({ status: 'error' }));
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  function handleCreated(thread: MobileCommunityRoomThread, newCount: number) {
    setShowCompose(false);
    setLoadState((prev) => {
      if (prev.status !== 'loaded') {
        return { status: 'loaded', threads: [thread], totalCount: newCount };
      }
      const alreadyExists = prev.threads.some((t) => t.id === thread.id);
      const threads = alreadyExists ? prev.threads : [thread, ...prev.threads];
      return { status: 'loaded', threads, totalCount: newCount };
    });
  }

  if (loadState.status === 'loading') {
    return (
      <div className="mt-8 pt-6 border-t border-[#454652]">
        <p className="text-[12px] text-[#454652]">Loading discussions…</p>
      </div>
    );
  }

  if (loadState.status === 'error') {
    return (
      <div className="mt-8 pt-6 border-t border-[#454652]">
        <span className="text-[12px] text-[#908f9e]">Couldn't load discussions. </span>
        <button
          type="button"
          onClick={load}
          className="text-[12px] text-[#bdc2ff] hover:text-[#dfe0ff] transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const { threads, totalCount } = loadState;
  const roomOpen = totalCount >= ROOM_THRESHOLD;
  const isEmpty = threads.length === 0;
  const lastActivityAt = threads[0]?.lastActivityAt ?? null;

  // Header button is only useful when there are existing threads to contextualise
  // the action. In the empty state the inline prompt handles it; when the room is
  // open the banner's "New thread" button handles it.
  const showHeaderButton = !showCompose && !roomOpen && !isEmpty;

  return (
    <div className="mt-8 pt-6 border-t border-[#454652]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold text-[#908f9e] uppercase tracking-wide">
          Discussions
        </span>
        {showHeaderButton && (
          <button
            type="button"
            onClick={() => setShowCompose(true)}
            className="h-6 px-2.5 text-[12px] text-[#c6c5d5] border border-[#454652] rounded-[4px] hover:border-[#bdc2ff] hover:text-[#bdc2ff] transition-colors"
          >
            + Add
          </button>
        )}
      </div>

      {showCompose && (
        <div className="mb-3">
          <EventDiscussionCompose
            eventId={eventId}
            onCreated={handleCreated}
            onCancel={() => setShowCompose(false)}
          />
        </div>
      )}

      {roomOpen ? (
        <EventRoomBanner
          eventId={eventId}
          threadCount={totalCount}
          lastActivityAt={lastActivityAt}
          onStartThread={() => setShowCompose(true)}
        />
      ) : isEmpty && !showCompose ? (
        <button
          type="button"
          onClick={() => setShowCompose(true)}
          className="w-full py-3 text-[13px] text-[#908f9e] hover:text-[#c6c5d5] transition-colors text-left"
        >
          No discussions yet. Be the first →
        </button>
      ) : !isEmpty ? (
        <EventThreadPreviewList
          threads={threads}
          totalCount={totalCount}
          eventId={eventId}
        />
      ) : null}
    </div>
  );
}
