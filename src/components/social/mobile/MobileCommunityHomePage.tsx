'use client';

import { startTransition, useCallback } from 'react';
import Link from 'next/link';
import {
  CalendarBlank,
  LockKey,
  MapPin,
  Monitor,
} from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import MobileAppShell from '@/components/common/mobile/MobileAppShell';
import MobileHeader from '@/components/common/mobile/MobileHeader';
import MobileCommunityCircleCell from '@/components/social/mobile/MobileCommunityCircleCell';
import MobileCommunityFeedCell from '@/components/social/mobile/MobileCommunityFeedCell';
import { useSnackbar } from '@/contexts/SnackbarContext';
import {
  formatCommunityTabCount,
  type CommunityFeedPageViewModel,
} from '@/components/social/community-page-shared';
import {
  formatCommunityEventDay,
  formatCommunityEventTime,
  partitionCommunityCirclesForDisplay,
} from '@/components/social/community-hub-shared';

interface MobileCommunityHomePageProps {
  viewModel: CommunityFeedPageViewModel;
}

export default function MobileCommunityHomePage({
  viewModel,
}: MobileCommunityHomePageProps) {
  const router = useRouter();
  const { showError, showSuccess } = useSnackbar();
  const { isSignedIn, feed, circles, upcomingEvents } = viewModel;
  const { joinedCircles, discoverCircles } = partitionCommunityCirclesForDisplay(circles);
  const visibleJoinedCircles = joinedCircles.slice(0, 4);
  const visibleDiscoverCircles = discoverCircles.slice(0, 4);
  const visibleCircleCount = joinedCircles.length + discoverCircles.length;
  const railEvents = upcomingEvents.slice(0, 3);

  const handleCircleToggle = useCallback(
    async (circleId: string, isCurrentlyJoined: boolean) => {
      try {
        const method = isCurrentlyJoined ? 'DELETE' : 'POST';
        const response = await fetch(`/api/community/circles/${circleId}/join`, {
          method,
        });

        if (!response.ok) {
          throw new Error('Failed');
        }

        showSuccess(isCurrentlyJoined ? 'Left circle.' : 'Joined circle!');
        startTransition(() => {
          router.refresh();
        });
      } catch (error) {
        showError(isCurrentlyJoined ? 'Could not leave circle.' : 'Could not join circle.');
        throw error;
      }
    },
    [router, showError, showSuccess]
  );

  return (
    <MobileAppShell
      headerClassName="pb-1"
      contentClassName="pt-2"
      header={
        <MobileHeader
          title="Community"
          subtitle="Recent discussions, right now."
          meta={
            <>
              {!isSignedIn ? (
                <span className="mobile-header__metaPill">Public preview</span>
              ) : null}
              <span className="mobile-header__metaPill">
                {formatCommunityTabCount(feed.length)} posts
              </span>
            </>
          }
          data-testid="mobile-community-home-header"
        />
      }
    >
      <main className="mobile-community-view">
        {!isSignedIn ? (
          <div className="mobile-community-authStrip">
            <div className="mobile-community-authCopy">
              <div className="mobile-community-authIcon">
                <LockKey size={15} weight="fill" />
              </div>
              <p className="mobile-community-authText">
                Sign in to join circles and reply.
              </p>
            </div>

            <div className="mobile-community-authActions">
              <Link
                href="/login?redirect=%2Fcommunity"
                className="inline-flex h-10 items-center justify-center rounded-full bg-[var(--foreground-primary)] px-4 text-sm font-medium text-[var(--background-main)]"
              >
                Log in
              </Link>
              <Link
                href="/signup?redirect=%2Fcommunity"
                className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--mobile-app-surface-border)] bg-[var(--background-main)]/28 px-4 text-sm font-medium text-[var(--foreground-primary)]"
              >
                Create account
              </Link>
            </div>
          </div>
        ) : null}

        {feed.length > 0 ? (
          <section className="mobile-community-group" aria-label="Community feed">
            <div className="mobile-community-rowList">
              {feed.map((post) => (
                <MobileCommunityFeedCell
                  key={post.id}
                  post={post}
                />
              ))}
            </div>
          </section>
        ) : (
          <section className="mobile-community-empty" aria-live="polite">
            <p className="mobile-community-emptyTitle">No discussions yet.</p>
            <p className="mobile-community-emptyBody">
              Check back when new threads land in the feed.
            </p>
          </section>
        )}

        {isSignedIn && visibleCircleCount > 0 ? (
          <section className="mobile-community-group" aria-labelledby="mobile-community-circles">
            <div className="mobile-community-groupHeader">
              <h2 id="mobile-community-circles" className="mobile-community-groupTitle">
                Circles
              </h2>
              <span className="mobile-community-groupMeta">
                {joinedCircles.length > 0
                  ? `${formatCommunityTabCount(joinedCircles.length)} joined`
                  : `${formatCommunityTabCount(visibleCircleCount)} available`}
              </span>
            </div>

            <div className="mobile-community-rowList">
              {visibleJoinedCircles.map((circle) => (
                <MobileCommunityCircleCell
                  key={circle.id}
                  circle={circle}
                  variant="joined"
                />
              ))}
              {visibleDiscoverCircles.map((circle) => (
                <MobileCommunityCircleCell
                  key={circle.id}
                  circle={circle}
                  variant="discover"
                  onToggle={handleCircleToggle}
                />
              ))}
            </div>
          </section>
        ) : null}

        {isSignedIn && railEvents.length > 0 ? (
          <section className="mobile-community-group" aria-labelledby="mobile-community-upcoming">
            <div className="mobile-community-groupHeader">
              <h2 id="mobile-community-upcoming" className="mobile-community-groupTitle">
                Upcoming
              </h2>
              <span className="mobile-community-groupMeta">
                {formatCommunityTabCount(railEvents.length)} events
              </span>
            </div>

            <div className="mobile-community-rowList">
              {railEvents.map((event) => {
                const { day, month } = formatCommunityEventDay(event.startTime);

                return (
                  <Link
                    key={event.id}
                    href={`/events/${event.slug}`}
                    className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[var(--background-main)]/30"
                  >
                    <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-[0.95rem] bg-[var(--background-main)]/60">
                      <span className="text-[17px] font-semibold leading-none text-[var(--foreground-primary)]">
                        {day}
                      </span>
                      <span className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--foreground-tertiary)]">
                        {month}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-[14px] font-semibold text-[var(--foreground-primary)]">
                        {event.title}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-[var(--foreground-tertiary)]">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarBlank size={12} weight="bold" />
                          <span>{formatCommunityEventTime(event.startTime)}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          {event.format === 'virtual' ? (
                            <Monitor size={12} weight="bold" />
                          ) : (
                            <MapPin size={12} weight="bold" />
                          )}
                          <span className="truncate">{event.location || 'Virtual'}</span>
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}
      </main>
    </MobileAppShell>
  );
}
