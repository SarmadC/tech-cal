'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import FollowButton from '@/components/social/FollowButton';
import {
  FOLLOW_STATUS_CHANGED_EVENT,
  applyFollowDelta,
  type FollowStatusChangedDetail,
} from '@/components/social/followEvents';

interface PublicProfileHeaderProps {
  profileUserId: string;
  username: string;
  fullName: string | null;
  headline: string | null;
  viewerId: string | null;
  isViewerOwner: boolean;
  initialFollowerCount: number;
  initialFollowingCount: number;
}

function formatCount(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export default function PublicProfileHeader({
  profileUserId,
  username,
  fullName,
  headline,
  viewerId,
  isViewerOwner,
  initialFollowerCount,
  initialFollowingCount,
}: PublicProfileHeaderProps) {
  const displayName = useMemo(
    () => fullName || `@${username}`,
    [fullName, username]
  );

  const [counts, setCounts] = useState({
    followerCount: initialFollowerCount,
    followingCount: initialFollowingCount,
  });

  useEffect(() => {
    const handleFollowStatusChanged = (event: Event) => {
      const customEvent = event as CustomEvent<FollowStatusChangedDetail>;
      const detail = customEvent.detail;
      if (!detail) {
        return;
      }

      setCounts((current) => {
        return applyFollowDelta(current, profileUserId, detail);
      });
    };

    window.addEventListener(
      FOLLOW_STATUS_CHANGED_EVENT,
      handleFollowStatusChanged as EventListener
    );

    return () => {
      window.removeEventListener(
        FOLLOW_STATUS_CHANGED_EVENT,
        handleFollowStatusChanged as EventListener
      );
    };
  }, [profileUserId]);

  return (
    <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--background-secondary)] p-5 sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--background-main)] text-lg font-semibold text-[var(--foreground-primary)]">
            {displayName.slice(0, 2).toUpperCase()}
          </div>

          <div className="min-w-0 space-y-1">
            <h1 className="truncate text-xl font-semibold text-[var(--foreground-primary)]">
              {displayName}
            </h1>
            <p className="truncate text-sm text-[var(--foreground-secondary)]">
              @{username}
            </p>
            {headline && (
              <p className="text-sm text-[var(--foreground-secondary)]">
                {headline}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-start">
          {viewerId ? (
            viewerId === profileUserId ? (
              <span className="text-xs text-[var(--foreground-tertiary)]">This is your profile</span>
            ) : (
              <FollowButton
                userId={profileUserId}
                telemetrySurface="public_profile_header"
              />
            )
          ) : (
            <Link
              href={`/login?redirect=${encodeURIComponent(`/u/${username}`)}`}
              className="rounded-md border border-[var(--border-default)] px-3 py-2 text-xs font-medium text-[var(--foreground-primary)] hover:bg-[var(--background-main)]"
            >
              Sign in to follow
            </Link>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-4 text-sm">
        <span className="text-[var(--foreground-primary)]">
          <strong>{formatCount(counts.followerCount)}</strong> followers
        </span>
        <span className="text-[var(--foreground-primary)]">
          <strong>{formatCount(counts.followingCount)}</strong> following
        </span>
        {isViewerOwner && (
          <Link
            href="/dashboard/settings"
            className="text-[var(--foreground-secondary)] underline hover:text-[var(--foreground-primary)]"
          >
            Edit social settings
          </Link>
        )}
      </div>
    </section>
  );
}
