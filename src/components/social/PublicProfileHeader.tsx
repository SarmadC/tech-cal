'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import FollowButton from '@/components/social/FollowButton';
import {
  FOLLOW_STATUS_CHANGED_EVENT,
  applyFollowDelta,
  type FollowStatusChangedDetail,
} from '@/components/social/followEvents';
import type { PublicCareerProfile } from '@/services/publicProfileService';
import { Briefcase, Building } from '@phosphor-icons/react';

interface PublicProfileHeaderProps {
  profileUserId: string;
  username: string;
  fullName: string | null;
  headline: string | null;
  avatarUrl: string | null;
  viewerId: string | null;
  isViewerOwner: boolean;
  initialFollowerCount: number;
  initialFollowingCount: number;
  careerProfile: PublicCareerProfile | null;
}

function formatCount(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatLabel(value: string | null): string {
  if (!value) return '';
  return value
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function PublicProfileHeader({
  profileUserId,
  username,
  fullName,
  headline,
  avatarUrl,
  viewerId,
  isViewerOwner: _isViewerOwner,
  initialFollowerCount,
  initialFollowingCount,
  careerProfile,
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

  const hasCareerContext = careerProfile?.currentRole || careerProfile?.companyName;

  return (
    <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--background-secondary)] overflow-hidden">
      {/* Cover Banner */}
      <div className="h-24 sm:h-32 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-emerald-500/20" />

      <div className="px-5 sm:px-7 pb-6">
        {/* Avatar and Main Info Row */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12 sm:-mt-16">
          {/* Avatar */}
          <div className="relative shrink-0">
            {avatarUrl ? (
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl border-4 border-[var(--background-secondary)] overflow-hidden bg-[var(--background-main)]">
                <Image
                  src={avatarUrl}
                  alt={displayName}
                  width={128}
                  height={128}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl border-4 border-[var(--background-secondary)] bg-[var(--background-main)] flex items-center justify-center text-2xl sm:text-3xl font-semibold text-[var(--foreground-primary)]">
                {displayName.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          {/* Name and Actions */}
          <div className="flex-1 min-w-0 sm:pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-semibold text-[var(--foreground-primary)] truncate">
                  {displayName}
                </h1>
                <p className="text-sm text-[var(--foreground-secondary)]">
                  @{username}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {viewerId ? (
                  viewerId === profileUserId ? (
                    <Link
                      href="/dashboard/settings"
                      className="inline-flex items-center px-4 py-2 rounded-lg border border-[var(--border-default)] text-sm font-medium text-[var(--foreground-primary)] hover:bg-[var(--background-main)] transition-colors"
                    >
                      Edit Profile
                    </Link>
                  ) : (
                    <FollowButton
                      userId={profileUserId}
                      telemetrySurface="public_profile_header"
                    />
                  )
                ) : (
                  <Link
                    href={`/login?redirect=${encodeURIComponent(`/u/${username}`)}`}
                    className="inline-flex items-center px-4 py-2 rounded-lg bg-[var(--foreground-primary)] text-[var(--background-main)] text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    Follow
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Headline */}
        {headline && (
          <p className="mt-4 text-[var(--foreground-secondary)] text-sm sm:text-base">
            {headline}
          </p>
        )}

        {/* Career Context */}
        {hasCareerContext && (
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--foreground-secondary)]">
            {careerProfile?.currentRole && (
              <div className="flex items-center gap-1.5">
                <Briefcase className="w-4 h-4" />
                <span>
                  {formatLabel(careerProfile.currentRole)}
                </span>
              </div>
            )}
            {careerProfile?.companyName && (
              <div className="flex items-center gap-1.5">
                <Building className="w-4 h-4" />
                <span>{careerProfile.companyName}</span>
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="mt-5 pt-4 border-t border-[var(--border-default)] flex flex-wrap items-center gap-4 text-sm">
          <span className="text-[var(--foreground-secondary)]">
            <strong className="text-[var(--foreground-primary)]">{formatCount(counts.followerCount)}</strong>{' '}
            followers
          </span>
          <span className="text-[var(--foreground-secondary)]">
            <strong className="text-[var(--foreground-primary)]">{formatCount(counts.followingCount)}</strong>{' '}
            following
          </span>
          {careerProfile?.lastUpdated && (
            <span className="text-[var(--foreground-tertiary)] text-xs">
              Profile updated {new Date(careerProfile.lastUpdated).toLocaleDateString('en-US', {
                month: 'short',
                year: 'numeric',
              })}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
