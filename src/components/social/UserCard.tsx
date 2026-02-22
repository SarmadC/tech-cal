'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import FollowButton from '@/components/social/FollowButton';

export interface UserCardData {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  username: string | null;
  headline: string | null;
  followerCount: number;
  followingCount: number;
}

interface UserCardProps {
  user: UserCardData;
  telemetrySurface?: string;
}

function formatCount(value: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

export default function UserCard({
  user,
  telemetrySurface = 'community_user_card',
}: UserCardProps) {
  return (
    <article className="rounded-lg border border-[var(--border-default)] bg-[var(--background-secondary)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.avatarUrl || ''} alt={user.fullName || user.username || 'User'} />
            <AvatarFallback className="text-xs">
              {(user.fullName || user.username || 'U').slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            {user.username ? (
              <Link
                href={`/u/${user.username}`}
                className="truncate text-sm font-semibold text-[var(--foreground-primary)] hover:underline"
              >
                {user.fullName || `@${user.username}`}
              </Link>
            ) : (
              <p className="truncate text-sm font-semibold text-[var(--foreground-primary)]">
                {user.fullName || 'Unknown user'}
              </p>
            )}
            <p className="truncate text-xs text-[var(--foreground-secondary)]">
              {user.username ? `@${user.username}` : 'No username'}
            </p>
          </div>
        </div>

        <FollowButton
          userId={user.id}
          compact
          telemetrySurface={telemetrySurface}
        />
      </div>

      {user.headline && (
        <p className="mt-2 line-clamp-2 text-xs text-[var(--foreground-secondary)]">
          {user.headline}
        </p>
      )}

      <p className="mt-3 text-[11px] text-[var(--foreground-tertiary)]">
        {formatCount(user.followerCount)} followers · {formatCount(user.followingCount)} following
      </p>
    </article>
  );
}
