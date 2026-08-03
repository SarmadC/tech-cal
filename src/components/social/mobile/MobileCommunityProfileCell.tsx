'use client';

import Link from 'next/link';
import { CaretRight } from '@phosphor-icons/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import FollowButton from '@/components/social/FollowButton';
import type { CommunityDirectoryProfile } from '@/services/communityDirectoryService';
import { formatCommunityCompactCount } from '@/components/social/community-hub-shared';

interface MobileCommunityProfileCellProps {
  profile: CommunityDirectoryProfile;
}

function formatLabel(value: string | null): string {
  if (!value) {
    return '';
  }

  return value.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function MobileCommunityProfileCell({
  profile,
}: MobileCommunityProfileCellProps) {
  const displayName = profile.fullName || `@${profile.username}`;
  const roleLine = formatLabel(profile.currentRole);

  return (
    <article className="px-4 py-4">
      <div className="flex items-start gap-3">
        <Link
          href={`/u/${profile.username}`}
          className="flex min-w-0 flex-1 items-start gap-3"
        >
          <Avatar className="h-12 w-12 shrink-0 border border-[var(--border-default)]/40 shadow-sm">
            <AvatarImage src={profile.avatarUrl || ''} alt={displayName} />
            <AvatarFallback className="bg-[var(--background-main)] text-sm font-semibold text-[var(--foreground-primary)]">
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-[15px] font-semibold tracking-[-0.02em] text-[var(--foreground-primary)]">
                {displayName}
              </p>
              <CaretRight
                size={14}
                className="shrink-0 text-[var(--foreground-tertiary)]"
              />
            </div>
            <p className="mt-0.5 truncate text-[12px] font-medium text-[var(--foreground-tertiary)]">
              @{profile.username}
            </p>

            {profile.headline ? (
              <p className="mt-2 line-clamp-2 text-[13px] leading-5 text-[var(--foreground-secondary)]">
                {profile.headline}
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
              {roleLine ? (
                <span className="rounded-full border border-[var(--border-default)] bg-[var(--background-main)]/65 px-2.5 py-1 text-[11px] font-medium text-[var(--foreground-primary)]">
                  {roleLine}
                </span>
              ) : null}
              {profile.companyName ? (
                <span className="rounded-full border border-[var(--border-default)] bg-[var(--background-main)]/65 px-2.5 py-1 text-[11px] font-medium text-[var(--foreground-secondary)]">
                  {profile.companyName}
                </span>
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-medium text-[var(--foreground-tertiary)]">
              <span className="rounded-full bg-[var(--background-main)]/55 px-2.5 py-1">
                {formatCommunityCompactCount(profile.followerCount)} followers
              </span>
              <span className="rounded-full bg-[var(--background-main)]/55 px-2.5 py-1">
                {formatCommunityCompactCount(profile.followingCount)} following
              </span>
            </div>
          </div>
        </Link>

        <div className="shrink-0 pt-0.5">
          <FollowButton
            userId={profile.id}
            compact
            telemetrySurface="community_directory_mobile_cell"
          />
        </div>
      </div>
    </article>
  );
}
