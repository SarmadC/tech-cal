'use client';

import { useState } from 'react';
import type { MobileCommunityRoomThread } from '@kurecal/domain';

interface EventDiscussionComposeProps {
  eventId: string;
  onCreated: (thread: MobileCommunityRoomThread, newCount: number) => void;
  onCancel: () => void;
}

export default function EventDiscussionCompose({
  eventId,
  onCreated,
  onCancel,
}: EventDiscussionComposeProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = title.trim().length > 0 && body.trim().length > 0 && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/events/${eventId}/threads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
        credentials: 'same-origin',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? 'Failed to post thread.');
        return;
      }
      setTitle('');
      setBody('');
      onCreated(json.data.thread, json.data.totalCount);
    } catch {
      setError('Failed to post thread. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    // animate-in + slide-in-from-top-1 come from tailwindcss-animate, which
    // automatically disables animation when prefers-reduced-motion is set.
    <form
      onSubmit={handleSubmit}
      className="border border-[#454652] rounded-[6px] bg-[#1f2021] overflow-hidden animate-in fade-in-0 slide-in-from-top-1 duration-[220ms]"
    >
      <div className="px-3 pt-3">
        <input
          type="text"
          placeholder="Thread title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={300}
          autoFocus
          className="w-full bg-transparent text-[13px] font-medium text-[#e3e2e3] placeholder-[#454652] outline-none border-b border-[#454652] pb-2 mb-2"
        />
        <textarea
          placeholder="What's on your mind?"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={10000}
          rows={3}
          className="w-full bg-transparent text-[13px] text-[#c6c5d5] placeholder-[#454652] outline-none resize-none leading-[1.4]"
        />
      </div>

      {error && (
        <p className="px-3 pb-1 text-[11px] text-red-400">{error}</p>
      )}

      <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-[#454652]">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="h-7 px-3 text-[13px] text-[#c6c5d5] hover:text-[#e3e2e3] transition-colors disabled:opacity-40"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="h-7 px-3 text-[13px] font-medium rounded-[4px] bg-[#bdc2ff] text-[#121f8b] hover:bg-[#dfe0ff] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? 'Posting…' : 'Post'}
        </button>
      </div>
    </form>
  );
}
