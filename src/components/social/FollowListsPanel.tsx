'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CircleNotchIcon } from '@phosphor-icons/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts';
import FollowButton from '@/components/social/FollowButton';
import {
  FOLLOW_STATUS_CHANGED_EVENT,
  applyFollowDelta,
  type FollowStatusChangedDetail,
} from '@/components/social/followEvents';

type FollowTab = 'followers' | 'following';

interface FollowListUser {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  username: string | null;
  headline: string | null;
  followerCount: number;
  followingCount: number;
  followedAt: string;
}

interface FollowListState {
  users: FollowListUser[];
  nextCursor: string | null;
  hasLoaded: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
}

interface FollowListResponse {
  success?: boolean;
  data?: {
    users?: FollowListUser[];
    nextCursor?: string | null;
  };
  error?: string;
}

interface FollowListsPanelProps {
  profileUserId: string;
  followerCount: number;
  followingCount: number;
}

const INITIAL_LIST_STATE: FollowListState = {
  users: [],
  nextCursor: null,
  hasLoaded: false,
  isLoading: false,
  isLoadingMore: false,
  error: null,
};

function formatCount(value: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function updateUsersFromFollowEvent(
  users: FollowListUser[],
  detail: FollowStatusChangedDetail
): FollowListUser[] {
  if (users.length === 0) {
    return users;
  }

  let hasChanges = false;

  const nextUsers = users.map((listUser) => {
    const nextCounts = applyFollowDelta(
      {
        followerCount: listUser.followerCount,
        followingCount: listUser.followingCount,
      },
      listUser.id,
      detail
    );

    if (
      nextCounts.followerCount === listUser.followerCount &&
      nextCounts.followingCount === listUser.followingCount
    ) {
      return listUser;
    }

    hasChanges = true;
    return {
      ...listUser,
      followerCount: nextCounts.followerCount,
      followingCount: nextCounts.followingCount,
    };
  });

  return hasChanges ? nextUsers : users;
}

export default function FollowListsPanel({
  profileUserId,
  followerCount,
  followingCount,
}: FollowListsPanelProps) {
  const { user, loading } = useAuth();
  const viewerId = user?.id ?? null;
  const [activeTab, setActiveTab] = useState<FollowTab>('followers');
  const [networkCounts, setNetworkCounts] = useState({
    followerCount,
    followingCount,
  });
  const [followersState, setFollowersState] = useState<FollowListState>(INITIAL_LIST_STATE);
  const [followingState, setFollowingState] = useState<FollowListState>(INITIAL_LIST_STATE);
  const hasRequestedInitialListsRef = useRef(false);

  useEffect(() => {
    setNetworkCounts({
      followerCount,
      followingCount,
    });
  }, [followerCount, followingCount, profileUserId]);

  useEffect(() => {
    setActiveTab('followers');
    setFollowersState(INITIAL_LIST_STATE);
    setFollowingState(INITIAL_LIST_STATE);
    hasRequestedInitialListsRef.current = false;
  }, [profileUserId]);

  useEffect(() => {
    const handleFollowStatusChanged = (event: Event) => {
      const customEvent = event as CustomEvent<FollowStatusChangedDetail>;
      const detail = customEvent.detail;
      if (!detail) {
        return;
      }

      setNetworkCounts((current) => {
        return applyFollowDelta(current, profileUserId, detail);
      });

      const updateListState = (current: FollowListState): FollowListState => {
        const nextUsers = updateUsersFromFollowEvent(current.users, detail);
        if (nextUsers === current.users) {
          return current;
        }

        return {
          ...current,
          users: nextUsers,
        };
      };

      setFollowersState(updateListState);
      setFollowingState(updateListState);
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

  const loadFollowList = useCallback(async ({
    tab,
    cursor,
    append = false,
  }: {
    tab: FollowTab;
    cursor?: string | null;
    append?: boolean;
  }) => {
    if (!viewerId) {
      return;
    }

    const setState = tab === 'followers' ? setFollowersState : setFollowingState;
    setState((current) => ({
      ...current,
      isLoading: !append && !current.hasLoaded,
      isLoadingMore: append,
      error: null,
    }));

    try {
      const searchParams = new URLSearchParams({
        userId: profileUserId,
        limit: '20',
      });

      if (cursor) {
        searchParams.set('cursor', cursor);
      }

      const response = await fetch(`/api/follows/${tab}?${searchParams.toString()}`, {
        credentials: 'include',
      });
      const payload = await response.json() as FollowListResponse;

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error || `Failed to load ${tab}.`);
      }

      const users = payload.data.users || [];
      const nextCursor = payload.data.nextCursor ?? null;

      setState((current) => ({
        users: append ? [...current.users, ...users] : users,
        nextCursor,
        hasLoaded: true,
        isLoading: false,
        isLoadingMore: false,
        error: null,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : `Failed to load ${tab}.`;
      setState((current) => ({
        ...current,
        isLoading: false,
        isLoadingMore: false,
        error: message,
      }));
    }
  }, [profileUserId, viewerId]);

  useEffect(() => {
    if (!viewerId || hasRequestedInitialListsRef.current) {
      return;
    }

    hasRequestedInitialListsRef.current = true;

    void Promise.all([
      loadFollowList({ tab: 'followers' }),
      loadFollowList({ tab: 'following' }),
    ]);
  }, [loadFollowList, viewerId]);

  const activeListState = useMemo(
    () => (activeTab === 'followers' ? followersState : followingState),
    [activeTab, followersState, followingState]
  );

  return (
    <section className="rounded-xl border border-[var(--border-default)] bg-[var(--background-secondary)] p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-[var(--foreground-primary)]">Network</h2>
        <p className="text-xs text-[var(--foreground-tertiary)]">
          Follow graph and public connections
        </p>
      </div>

      <div className="mb-4 inline-flex rounded-md border border-[var(--border-default)] bg-[var(--background-main)] p-1">
        <button
          type="button"
          className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
            activeTab === 'followers'
              ? 'bg-[var(--foreground-primary)] text-[var(--background-main)]'
              : 'text-[var(--foreground-secondary)] hover:text-[var(--foreground-primary)]'
          }`}
          onClick={() => setActiveTab('followers')}
        >
          Followers ({formatCount(networkCounts.followerCount)})
        </button>
        <button
          type="button"
          className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
            activeTab === 'following'
              ? 'bg-[var(--foreground-primary)] text-[var(--background-main)]'
              : 'text-[var(--foreground-secondary)] hover:text-[var(--foreground-primary)]'
          }`}
          onClick={() => setActiveTab('following')}
        >
          Following ({formatCount(networkCounts.followingCount)})
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-[var(--foreground-secondary)]">
          <CircleNotchIcon className="h-4 w-4 animate-spin" />
          Loading network...
        </div>
      ) : !viewerId ? (
        <p className="text-sm text-[var(--foreground-secondary)]">
          <Link href="/login" className="underline hover:text-[var(--foreground-primary)]">
            Sign in
          </Link>{' '}
          to view follower and following lists.
        </p>
      ) : activeListState.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-[var(--foreground-secondary)]">
          <CircleNotchIcon className="h-4 w-4 animate-spin" />
          Loading {activeTab}...
        </div>
      ) : activeListState.error ? (
        <p className="text-sm text-[var(--error)]">{activeListState.error}</p>
      ) : activeListState.users.length === 0 ? (
        <p className="text-sm text-[var(--foreground-secondary)]">
          No {activeTab} yet.
        </p>
      ) : (
        <>
          <ul className="space-y-2">
            {activeListState.users.map((listUser) => (
              <li
                key={`${activeTab}-${listUser.id}-${listUser.followedAt}`}
                className="flex items-center justify-between gap-3 rounded-md border border-[var(--border-default)] bg-[var(--background-main)] p-2.5"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={listUser.avatarUrl || ''} alt={listUser.fullName || 'User'} />
                    <AvatarFallback className="text-xs">
                      {(listUser.fullName || listUser.username || 'U').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    {listUser.username ? (
                      <Link
                        href={`/u/${listUser.username}`}
                        className="truncate text-sm font-medium text-[var(--foreground-primary)] hover:underline"
                      >
                        {listUser.fullName || `@${listUser.username}`}
                      </Link>
                    ) : (
                      <p className="truncate text-sm font-medium text-[var(--foreground-primary)]">
                        {listUser.fullName || 'Unknown user'}
                      </p>
                    )}
                    {listUser.headline && (
                      <p className="truncate text-xs text-[var(--foreground-secondary)]">
                        {listUser.headline}
                      </p>
                    )}
                    <p className="truncate text-[11px] text-[var(--foreground-tertiary)]">
                      {formatCount(listUser.followerCount)} followers · {formatCount(listUser.followingCount)} following
                    </p>
                  </div>
                </div>

                <FollowButton
                  userId={listUser.id}
                  compact
                  telemetrySurface={
                    activeTab === 'followers'
                      ? 'public_profile_followers_list'
                      : 'public_profile_following_list'
                  }
                />
              </li>
            ))}
          </ul>

          {activeListState.nextCursor && (
            <div className="mt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  void loadFollowList({
                    tab: activeTab,
                    cursor: activeListState.nextCursor,
                    append: true,
                  });
                }}
                disabled={activeListState.isLoadingMore}
              >
                {activeListState.isLoadingMore ? (
                  <>
                    <CircleNotchIcon className="h-3.5 w-3.5 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load more'
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
