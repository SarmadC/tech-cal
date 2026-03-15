'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import FollowButton from '@/components/social/FollowButton';
import type { CommunityDirectoryProfile } from '@/services/communityDirectoryService';

interface CommunityDirectoryCardProps {
  profile: CommunityDirectoryProfile;
}

function formatCount(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function formatLabel(value: string | null): string {
  if (!value) {
    return '';
  }

  return value.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function CommunityDirectoryCard({
  profile,
}: CommunityDirectoryCardProps) {
  const displayName = profile.fullName || `@${profile.username}`;
  const roleLine = [formatLabel(profile.currentRole), formatLabel(profile.seniority)]
    .filter(Boolean)
    .join(' · ');

  return (
    <article className="group relative overflow-hidden rounded-[28px] border border-[var(--border-default)] bg-[var(--background-secondary)] shadow-[0_20px_80px_rgba(0,0,0,0.08)] transition-transform duration-200 hover:-translate-y-1">
      <div className="flex h-full flex-col p-5">
        <div className="flex items-start justify-between gap-4">
          <Link href={`/u/${profile.username}`} className="flex min-w-0 items-start gap-4">
            <Avatar className="h-14 w-14 border border-white/10 shadow-sm">
              <AvatarImage src={profile.avatarUrl || ''} alt={displayName} />
              <AvatarFallback className="bg-[var(--background-main)] text-sm font-semibold">
                {displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-[var(--foreground-primary)]">
                {displayName}
              </p>
              <p className="truncate text-sm text-[var(--foreground-secondary)]">
                @{profile.username}
              </p>
            </div>
          </Link>

          <FollowButton
            userId={profile.id}
            compact
            telemetrySurface="community_directory_card"
          />
        </div>

        {profile.headline && (
          <p className="mt-4 line-clamp-3 text-sm leading-6 text-[var(--foreground-secondary)]">
            {profile.headline}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {roleLine && (
            <span className="rounded-full border border-[var(--border-default)] bg-[var(--background-secondary)] px-2.5 py-1 text-xs font-medium text-[var(--foreground-primary)]">
              {roleLine}
            </span>
          )}
          {profile.industry && (
            <span className="rounded-full border border-[var(--border-default)] bg-[var(--background-secondary)] px-2.5 py-1 text-xs font-medium text-[var(--foreground-primary)]">
              {profile.industry}
            </span>
          )}
        </div>

        <div className="mt-6 border-t border-[var(--border-default)] pt-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--foreground-tertiary)]">
              Followers
            </p>
            <p className="mt-1 text-sm font-semibold text-[var(--foreground-primary)]">
              {formatCount(profile.followerCount)}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-[var(--foreground-tertiary)]">
            {formatCount(profile.followingCount)} following
          </span>
          <Link
            href={`/u/${profile.username}`}
            className="font-medium text-[var(--foreground-primary)] underline decoration-[var(--border-default)] underline-offset-4 transition-colors hover:text-[var(--foreground-secondary)]"
          >
            View profile
          </Link>
        </div>
      </div>
    </article>
  );
}
