import Link from 'next/link';
import { ChatCircle } from '@phosphor-icons/react/ssr';
import type { MobileCommunityRoomThread } from '@kurecal/domain';
import { formatRelativeTime } from '@/utils/dateUtils';
import ThreadAuthorAvatar from './ThreadAuthorAvatar';

const PREVIEW_LIMIT = 3;

interface EventThreadPreviewListProps {
  threads: MobileCommunityRoomThread[];
  totalCount: number;
  eventId: string;
}

export default function EventThreadPreviewList({
  threads,
  totalCount,
  eventId,
}: EventThreadPreviewListProps) {
  const preview = threads.slice(0, PREVIEW_LIMIT);
  const hasMore = totalCount > PREVIEW_LIMIT;

  return (
    <div className="divide-y divide-[#454652]">
      {preview.map((thread) => (
        <Link
          key={thread.id}
          href={`/event/${eventId}/room#${thread.id}`}
          className="flex items-center gap-2 py-2 group"
        >
          <ThreadAuthorAvatar
            avatarUrl={thread.author.avatarUrl}
            fullName={thread.author.fullName}
            username={thread.author.username}
            size="sm"
          />

          <span className="flex-1 text-[13px] text-[#e3e2e3] truncate group-hover:text-[#bdc2ff] transition-colors">
            {thread.title}
          </span>

          {thread.commentCount > 0 && (
            <span className="flex items-center gap-1 flex-shrink-0 text-[11px] text-[#908f9e]">
              <ChatCircle size={12} />
              {thread.commentCount}
            </span>
          )}

          <span className="flex-shrink-0 text-[11px] text-[#908f9e]">
            {formatRelativeTime(thread.lastActivityAt)}
          </span>
        </Link>
      ))}

      {hasMore && (
        <div className="pt-2">
          <Link
            href={`/event/${eventId}/room`}
            className="text-[12px] text-[#bdc2ff] hover:text-[#dfe0ff] transition-colors"
          >
            See all {totalCount} discussions →
          </Link>
        </div>
      )}
    </div>
  );
}
