'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { LockKey } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import FeedPostItem from '@/components/social/FeedPostItem';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { MaterialIcon } from '@/components/ui/Icon';
import { BrandLoadingLogo } from '@/components/brand/BrandLoadingLogo';
import {
  formatCommunityTabCount,
  type CommunityFeedPageViewModel,
} from '@/components/social/community-page-shared';
import {
  formatCommunityCircleName,
  getCommunityCircleColor,
  getCommunityCircleIcon,
  partitionCommunityCirclesForDisplay,
} from '@/components/social/community-hub-shared';

interface DesktopCommunityHomePageProps {
  viewModel: CommunityFeedPageViewModel;
}

interface CommunityCircleRowProps {
  circle: CommunityFeedPageViewModel['circles'][number];
}

interface CommunityDiscoverRowProps extends CommunityCircleRowProps {
  isPending: boolean;
  onJoin: (circleId: string) => void;
}

function CommunityCircleRow({ circle }: CommunityCircleRowProps) {
  return (
    <Link
      href={circle.href}
      className="group flex items-start gap-4 py-4 transition-colors hover:bg-[var(--background-secondary)]/18"
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${getCommunityCircleColor(circle.name)}`}
      >
        <MaterialIcon
          name={getCommunityCircleIcon(circle.name, circle.icon)}
          size={18}
          className="text-white"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[var(--foreground-primary)]">
          {formatCommunityCircleName(circle.name)}
        </p>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--foreground-secondary)]">
          {circle.description || 'A community circle'}
        </p>
        <p className="mt-2 text-xs text-[var(--foreground-tertiary)]">
          {formatCommunityTabCount(circle.memberCount)} members
        </p>
      </div>
    </Link>
  );
}

function CommunityDiscoverRow({
  circle,
  isPending,
  onJoin,
}: CommunityDiscoverRowProps) {
  return (
    <article className="flex items-start gap-4 py-4">
      <Link href={circle.href} className="group flex min-w-0 flex-1 items-start gap-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${getCommunityCircleColor(circle.name)}`}
        >
          <MaterialIcon
            name={getCommunityCircleIcon(circle.name, circle.icon)}
            size={18}
            className="text-white"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--foreground-primary)]">
            {formatCommunityCircleName(circle.name)}
          </p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--foreground-secondary)]">
            {circle.description || 'A community circle'}
          </p>
          <p className="mt-2 text-xs text-[var(--foreground-tertiary)]">
            {formatCommunityTabCount(circle.memberCount)} members
          </p>
        </div>
      </Link>
      <button
        type="button"
        onClick={() => onJoin(circle.id)}
        disabled={isPending}
        className="inline-flex h-8 shrink-0 items-center justify-center rounded-full border border-[var(--border-default)] px-3 text-xs font-semibold text-[var(--foreground-primary)] transition-colors hover:bg-[var(--background-secondary)]/18 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? <BrandLoadingLogo className="h-3.5 w-3.5 text-current" inline label={null} size={14} /> : 'Join'}
      </button>
    </article>
  );
}

export default function DesktopCommunityHomePage({
  viewModel,
}: DesktopCommunityHomePageProps) {
  const router = useRouter();
  const { showError, showSuccess } = useSnackbar();
  const [pendingCircleIds, setPendingCircleIds] = useState<Record<string, boolean>>({});
  const { isSignedIn, feed, circles, upcomingEvents } = viewModel;
  const leadPost = feed[0] ?? null;
  const remainingPosts = feed.slice(1);
  const { joinedCircles, discoverCircles } = partitionCommunityCirclesForDisplay(circles);
  const visibleJoinedCircles = joinedCircles.slice(0, 4);
  const visibleDiscoverCircles = discoverCircles.slice(0, 4);
  const railEvents = upcomingEvents.slice(0, 4);

  const handleJoinCircle = useCallback(
    async (circleId: string) => {
      if (pendingCircleIds[circleId]) {
        return;
      }

      try {
        setPendingCircleIds((current) => ({ ...current, [circleId]: true }));

        const response = await fetch(`/api/community/circles/${circleId}/join`, {
          method: 'POST',
        });

        if (!response.ok) {
          throw new Error('Failed');
        }

        showSuccess('Joined circle!');
        router.refresh();
      } catch (error) {
        showError('Could not join circle.');
        throw error;
      } finally {
        setPendingCircleIds((current) => ({ ...current, [circleId]: false }));
      }
    },
    [pendingCircleIds, router, showError, showSuccess]
  );

  return (
    <main className="min-h-screen bg-[var(--background-main)]">
      <section>
        <div className="mx-auto max-w-[1320px] px-4 pb-10 pt-16 sm:px-6 lg:px-8">
          <div className="max-w-4xl">
            <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-[var(--foreground-primary)] sm:text-5xl lg:text-6xl">
              See what the community is discussing right now.
            </h1>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-4 pb-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.7fr)_320px] lg:items-start">
          <div className="space-y-6">
            {leadPost ? (
              <FeedPostItem post={leadPost} variant="featured" surface="flat" />
            ) : (
              <div className="border-b border-dashed border-[var(--border-default)] px-2 pb-10 pt-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--foreground-tertiary)]">
                  Feed
                </p>
                <h2 className="mt-4 text-2xl font-semibold text-[var(--foreground-primary)]">
                  The conversation feed is quiet right now.
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--foreground-secondary)]">
                  New community posts will show up here first. When more threads land,
                  they will stack here automatically.
                </p>
              </div>
            )}

            {!isSignedIn ? (
              <section className="border-y border-[var(--border-default)]/70 py-6">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--foreground-tertiary)]">
                      <LockKey size={12} weight="fill" />
                      Public preview
                    </div>
                    <h2 className="mt-4 text-2xl font-semibold text-[var(--foreground-primary)]">
                      Sign in to personalize the feed and join the replies.
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--foreground-secondary)]">
                      The preview stays public, but your joined circles, event context,
                      and reply actions attach to your account.
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-3">
                    <Link
                      href="/login?redirect=%2Fcommunity"
                      className="inline-flex items-center rounded-full bg-[var(--foreground-primary)] px-5 py-2.5 text-sm font-medium text-[var(--background-main)] transition-opacity hover:opacity-90"
                    >
                      Log in
                    </Link>
                    <Link
                      href="/signup?redirect=%2Fcommunity"
                      className="inline-flex items-center rounded-full border border-[var(--border-default)] px-5 py-2.5 text-sm font-medium text-[var(--foreground-primary)] transition-colors hover:bg-[var(--background-main)]/30"
                    >
                      Create account
                    </Link>
                  </div>
                </div>
              </section>
            ) : null}

            {remainingPosts.length > 0 ? (
              <section>
                <div className="flex items-center justify-between border-b border-[var(--border-default)]/70 pb-5">
                  <div>
                    <h2 className="text-xl font-semibold text-[var(--foreground-primary)]">
                      More from the community
                    </h2>
                  </div>
                  <span className="text-xs font-medium text-[var(--foreground-secondary)]">
                    {formatCommunityTabCount(remainingPosts.length)} posts
                  </span>
                </div>
                <div>
                  {remainingPosts.map((post) => (
                    <FeedPostItem key={post.id} post={post} surface="flat" />
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24">
            {isSignedIn && visibleJoinedCircles.length > 0 ? (
              <section className="pb-6">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground-tertiary)]">
                  Your circles
                </p>

                <div className="mt-4 divide-y divide-[var(--border-default)]/55">
                  {visibleJoinedCircles.map((circle) => (
                    <CommunityCircleRow key={circle.id} circle={circle} />
                  ))}
                </div>
              </section>
            ) : null}

            {isSignedIn && visibleDiscoverCircles.length > 0 ? (
              <section className="pb-6">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground-tertiary)]">
                  Discover circles
                </p>

                <div className="mt-4 divide-y divide-[var(--border-default)]/55">
                  {visibleDiscoverCircles.map((circle) => (
                    <CommunityDiscoverRow
                      key={circle.id}
                      circle={circle}
                      isPending={Boolean(pendingCircleIds[circle.id])}
                      onJoin={(circleId) => {
                        void handleJoinCircle(circleId);
                      }}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {isSignedIn && railEvents.length > 0 ? (
              <section className="border-b border-[var(--border-default)]/70 pb-2">
                <div className="divide-y divide-[var(--border-default)]/55">
                  {railEvents.map((event) => (
                    <Link
                      key={event.id}
                      href={`/events/${event.slug}`}
                      className="block py-4 transition-colors hover:bg-[var(--background-secondary)]/18"
                    >
                      <p className="line-clamp-2 text-sm font-semibold text-[var(--foreground-primary)]">
                        {event.title}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </aside>
        </div>
      </section>
    </main>
  );
}
