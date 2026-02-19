'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CircleNotchIcon, MagnifyingGlass, Sparkle, X } from '@phosphor-icons/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import FollowButton from '@/components/social/FollowButton';
import {
  FOLLOW_STATUS_CHANGED_EVENT,
  applyFollowDelta,
  type FollowStatusChangedDetail,
} from '@/components/social/followEvents';
import { sendTelemetryEvent } from '@/utils/telemetryClient';

interface CommunityUserActivity {
  upcomingAttendingCount: number;
  attendingThisWeekCount: number;
  sharedSavedEventCount: number;
  recentFollowerCount: number;
  isViewerFollowing: boolean;
}

interface CommunityUser {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  username: string | null;
  headline: string | null;
  joinedAt: string | null;
  followerCount: number;
  followingCount: number;
  activity: CommunityUserActivity;
}

interface CommunityHighlights {
  attendingSavedEvents: CommunityUser[];
  networkAttendingThisWeek: CommunityUser[];
  newMembers: CommunityUser[];
}

interface UserSearchResponse {
  success?: boolean;
  data?: {
    users?: CommunityUser[];
    nextCursor?: string | null;
    highlights?: Partial<CommunityHighlights>;
  };
  error?: string;
}

type CommunitySortMode = 'newest' | 'popular' | 'active';

const EMPTY_HIGHLIGHTS: CommunityHighlights = {
  attendingSavedEvents: [],
  networkAttendingThisWeek: [],
  newMembers: [],
};

const SORT_MODE_LABELS: Record<CommunitySortMode, string> = {
  newest: 'Newest',
  popular: 'Most followed',
  active: 'Most active',
};

function parseSortModeParam(value: string | null): CommunitySortMode {
  if (value === 'popular' || value === 'active') {
    return value;
  }

  return 'newest';
}

function parseHasHeadlineParam(value: string | null): boolean {
  return value === '1' || value === 'true';
}

function normalizeHighlights(highlights?: Partial<CommunityHighlights>): CommunityHighlights {
  return {
    attendingSavedEvents: highlights?.attendingSavedEvents || [],
    networkAttendingThisWeek: highlights?.networkAttendingThisWeek || [],
    newMembers: highlights?.newMembers || [],
  };
}

function formatCompactCount(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function pluralize(value: number, singular: string, plural = `${singular}s`): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

function formatRelativeJoinDate(joinedAt: string | null): string {
  if (!joinedAt) {
    return 'joined recently';
  }

  const joinedTimestamp = Date.parse(joinedAt);
  if (!Number.isFinite(joinedTimestamp)) {
    return 'joined recently';
  }

  const dayMs = 24 * 60 * 60 * 1000;
  const dayDiff = Math.max(0, Math.floor((Date.now() - joinedTimestamp) / dayMs));

  if (dayDiff === 0) return 'joined today';
  if (dayDiff === 1) return 'joined yesterday';
  if (dayDiff < 7) return `joined ${dayDiff}d ago`;

  const weekDiff = Math.floor(dayDiff / 7);
  if (weekDiff <= 4) return `joined ${weekDiff}w ago`;

  return 'joined recently';
}

function getActivitySignals(user: CommunityUser): string[] {
  const signals: string[] = [];

  if (user.activity.sharedSavedEventCount > 0) {
    signals.push(`${pluralize(user.activity.sharedSavedEventCount, 'shared saved event')}`);
  }

  if (user.activity.attendingThisWeekCount > 0) {
    signals.push(`attending ${pluralize(user.activity.attendingThisWeekCount, 'event')} this week`);
  } else if (user.activity.upcomingAttendingCount > 0) {
    signals.push(`${pluralize(user.activity.upcomingAttendingCount, 'upcoming event')}`);
  }

  if (user.activity.recentFollowerCount > 0) {
    signals.push(`+${pluralize(user.activity.recentFollowerCount, 'new follower')} this week`);
  }

  if (signals.length === 0) {
    signals.push(formatRelativeJoinDate(user.joinedAt));
  }

  return signals.slice(0, 2);
}

function getUserJoinTimestamp(user: CommunityUser): number {
  if (!user.joinedAt) {
    return 0;
  }

  const timestamp = Date.parse(user.joinedAt);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getUserActivityScore(user: CommunityUser): number {
  return (
    user.activity.sharedSavedEventCount * 4 +
    user.activity.attendingThisWeekCount * 3 +
    user.activity.upcomingAttendingCount * 2 +
    user.activity.recentFollowerCount
  );
}

interface CommunityUserRowProps {
  user: CommunityUser;
  telemetrySurface: string;
  activityHint?: string | null;
  onProfileClick?: (user: CommunityUser) => void;
  onFollowStatusChange?: (user: CommunityUser, isFollowing: boolean) => void;
}

function CommunityUserRow({
  user,
  telemetrySurface,
  activityHint,
  onProfileClick,
  onFollowStatusChange,
}: CommunityUserRowProps) {
  const displayName = user.fullName || (user.username ? `@${user.username}` : 'Unknown user');
  const signals = getActivitySignals(user);

  return (
    <li className="py-4 transition-colors hover:bg-[var(--background-secondary)]/40">
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={user.avatarUrl || ''} alt={displayName} />
          <AvatarFallback className="text-[10px]">
            {displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          {user.username ? (
            <Link
              href={`/u/${user.username}`}
              className="block truncate text-sm font-medium text-[var(--foreground-primary)] hover:underline"
              onClick={() => onProfileClick?.(user)}
            >
              {displayName}
            </Link>
          ) : (
            <p className="truncate text-sm font-medium text-[var(--foreground-primary)]">{displayName}</p>
          )}

          <p className="truncate text-xs text-[var(--foreground-tertiary)]">
            {user.username ? `@${user.username}` : 'No username'}
          </p>

          {user.headline && (
            <p className="mt-1 line-clamp-2 text-xs text-[var(--foreground-secondary)]">{user.headline}</p>
          )}

          <p className="mt-2 line-clamp-1 text-[11px] text-[var(--foreground-tertiary)]">
            {activityHint || signals.join(' · ')}
          </p>

          <p className="mt-1 text-[11px] text-[var(--foreground-tertiary)]">
            {formatCompactCount(user.followerCount)} followers · {formatCompactCount(user.followingCount)} following
          </p>
        </div>

        <FollowButton
          userId={user.id}
          compact
          telemetrySurface={telemetrySurface}
          onStatusChange={(isFollowing) => onFollowStatusChange?.(user, isFollowing)}
        />
      </div>
    </li>
  );
}

interface CommunityHighlightListProps {
  sectionKey: string;
  title: string;
  users: CommunityUser[];
  telemetrySurface: string;
  activityHint: (user: CommunityUser) => string;
  onProfileClick?: (sectionKey: string, user: CommunityUser) => void;
  onFollowStatusChange?: (sectionKey: string, user: CommunityUser, isFollowing: boolean) => void;
}

function CommunityHighlightList({
  sectionKey,
  title,
  users,
  telemetrySurface,
  activityHint,
  onProfileClick,
  onFollowStatusChange,
}: CommunityHighlightListProps) {
  if (users.length === 0) {
    return null;
  }

  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--foreground-tertiary)]">
        {title}
      </h3>
      <ul className="mt-2 divide-y divide-[var(--border-default)] border-y border-[var(--border-default)]">
        {users.map((user) => (
          <CommunityUserRow
            key={`${title}-${user.id}`}
            user={user}
            telemetrySurface={telemetrySurface}
            activityHint={activityHint(user)}
            onProfileClick={(targetUser) => onProfileClick?.(sectionKey, targetUser)}
            onFollowStatusChange={(targetUser, isFollowing) => {
              onFollowStatusChange?.(sectionKey, targetUser, isFollowing);
            }}
          />
        ))}
      </ul>
    </section>
  );
}

export default function CommunityDirectory() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [queryInput, setQueryInput] = useState(() => {
    return (searchParams.get('q') ?? '').slice(0, 80);
  });
  const [hasHeadlineOnly, setHasHeadlineOnly] = useState(() => {
    return parseHasHeadlineParam(searchParams.get('hasHeadline'));
  });
  const [sortMode, setSortMode] = useState<CommunitySortMode>(() => {
    return parseSortModeParam(searchParams.get('sort'));
  });
  const [users, setUsers] = useState<CommunityUser[]>([]);
  const [highlights, setHighlights] = useState<CommunityHighlights>(EMPTY_HIGHLIGHTS);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const highlightImpressionsSentRef = useRef<Set<string>>(new Set());
  const highlightImpressionScopeRef = useRef('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const nextQueryInput = (searchParams.get('q') ?? '').slice(0, 80);
    const nextHasHeadlineOnly = parseHasHeadlineParam(searchParams.get('hasHeadline'));
    const nextSortMode = parseSortModeParam(searchParams.get('sort'));

    if (nextQueryInput !== queryInput) {
      setQueryInput(nextQueryInput);
    }
    if (nextHasHeadlineOnly !== hasHeadlineOnly) {
      setHasHeadlineOnly(nextHasHeadlineOnly);
    }
    if (nextSortMode !== sortMode) {
      setSortMode(nextSortMode);
    }
  }, [hasHeadlineOnly, queryInput, searchParams, sortMode]);

  const normalizedQuery = useMemo(() => queryInput.trim(), [queryInput]);
  const highlightScopeKey = useMemo(
    () => `${normalizedQuery.toLowerCase()}|${hasHeadlineOnly ? '1' : '0'}`,
    [hasHeadlineOnly, normalizedQuery]
  );
  const hasActiveFilters = normalizedQuery.length > 0 || hasHeadlineOnly;
  const hasProfilesWithHeadlines = useMemo(
    () => users.filter((user) => Boolean(user.headline)).length,
    [users]
  );
  const sortedUsers = useMemo(() => {
    const nextUsers = [...users];
    nextUsers.sort((left, right) => {
      if (sortMode === 'popular') {
        if (right.followerCount !== left.followerCount) {
          return right.followerCount - left.followerCount;
        }
        return getUserJoinTimestamp(right) - getUserJoinTimestamp(left);
      }

      if (sortMode === 'active') {
        const rightScore = getUserActivityScore(right);
        const leftScore = getUserActivityScore(left);
        if (rightScore !== leftScore) {
          return rightScore - leftScore;
        }
        return right.followerCount - left.followerCount;
      }

      return getUserJoinTimestamp(right) - getUserJoinTimestamp(left);
    });
    return nextUsers;
  }, [sortMode, users]);
  const suggestedUsers = useMemo(() => {
    return [...users]
      .sort((left, right) => {
        if (right.followerCount !== left.followerCount) {
          return right.followerCount - left.followerCount;
        }

        return (left.fullName || left.username || '').localeCompare(
          right.fullName || right.username || ''
        );
      })
      .slice(0, 4);
  }, [users]);
  const hasHighlights = useMemo(() => {
    return (
      highlights.attendingSavedEvents.length > 0 ||
      highlights.networkAttendingThisWeek.length > 0 ||
      highlights.newMembers.length > 0
    );
  }, [highlights]);
  const resultLabel = useMemo(() => {
    if (users.length === 0) {
      return hasActiveFilters
        ? 'No results with your current filters.'
        : 'No public profiles yet.';
    }

    const userCountLabel = `${users.length} ${users.length === 1 ? 'profile' : 'profiles'} shown`;
    const sortHint = `Sorted by ${SORT_MODE_LABELS[sortMode].toLowerCase()}.`;
    if (!hasHeadlineOnly) {
      return `${userCountLabel}. ${hasProfilesWithHeadlines} include a headline. ${sortHint}`;
    }

    return `${userCountLabel}. Headline-only filter is active. ${sortHint}`;
  }, [hasActiveFilters, hasHeadlineOnly, hasProfilesWithHeadlines, sortMode, users.length]);

  const fetchUsers = useCallback(async ({
    cursor = null,
    append = false,
  }: {
    cursor?: string | null;
    append?: boolean;
  } = {}) => {
    try {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const searchParams = new URLSearchParams({
        limit: '20',
      });

      if (normalizedQuery) {
        searchParams.set('q', normalizedQuery);
      }

      if (hasHeadlineOnly) {
        searchParams.set('hasHeadline', 'true');
      }

      if (cursor) {
        searchParams.set('cursor', cursor);
      }

      const response = await fetch(`/api/users/search?${searchParams.toString()}`, {
        credentials: 'include',
      });
      const payload = (await response.json()) as UserSearchResponse;

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error || 'Failed to load users.');
      }

      const incomingUsers = payload.data.users || [];
      setUsers((current) => (append ? [...current, ...incomingUsers] : incomingUsers));
      if (!append) {
        setHighlights(normalizeHighlights(payload.data.highlights));
      }
      setNextCursor(payload.data.nextCursor ?? null);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load users.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [hasHeadlineOnly, normalizedQuery]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const nextParams = new URLSearchParams(searchParams.toString());

      if (normalizedQuery.length > 0) {
        nextParams.set('q', normalizedQuery);
      } else {
        nextParams.delete('q');
      }

      if (hasHeadlineOnly) {
        nextParams.set('hasHeadline', '1');
      } else {
        nextParams.delete('hasHeadline');
      }

      if (sortMode !== 'newest') {
        nextParams.set('sort', sortMode);
      } else {
        nextParams.delete('sort');
      }

      const nextQueryString = nextParams.toString();
      const currentQueryString = searchParams.toString();
      if (nextQueryString === currentQueryString) {
        return;
      }

      router.replace(nextQueryString.length > 0 ? `${pathname}?${nextQueryString}` : pathname, {
        scroll: false,
      });
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [hasHeadlineOnly, normalizedQuery, pathname, router, searchParams, sortMode]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchUsers();
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [fetchUsers]);

  useEffect(() => {
    const handleFollowStatusChanged = (event: Event) => {
      const customEvent = event as CustomEvent<FollowStatusChangedDetail>;
      const detail = customEvent.detail;

      if (!detail) {
        return;
      }

      const applyDeltaToUsers = (currentUsers: CommunityUser[]) => {
        let hasChanges = false;
        const nextUsers = currentUsers.map((user) => {
          const updatedUser = applyFollowDelta(user, user.id, detail);
          if (updatedUser !== user) {
            hasChanges = true;
          }
          return updatedUser;
        });

        return hasChanges ? nextUsers : currentUsers;
      };

      setUsers((currentUsers) => applyDeltaToUsers(currentUsers));
      setHighlights((currentHighlights) => ({
        attendingSavedEvents: applyDeltaToUsers(currentHighlights.attendingSavedEvents),
        networkAttendingThisWeek: applyDeltaToUsers(currentHighlights.networkAttendingThisWeek),
        newMembers: applyDeltaToUsers(currentHighlights.newMembers),
      }));
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
  }, []);

  useEffect(() => {
    if (highlightImpressionScopeRef.current !== highlightScopeKey) {
      highlightImpressionScopeRef.current = highlightScopeKey;
      highlightImpressionsSentRef.current.clear();
    }
  }, [highlightScopeKey]);

  useEffect(() => {
    const handleSlashFocus = (event: KeyboardEvent) => {
      if (event.key !== '/') {
        return;
      }

      const target = event.target as HTMLElement | null;
      const isTypingTarget = Boolean(
        target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.tagName === 'SELECT' ||
            target.isContentEditable)
      );

      if (isTypingTarget) {
        return;
      }

      event.preventDefault();
      searchInputRef.current?.focus();
    };

    window.addEventListener('keydown', handleSlashFocus);
    return () => {
      window.removeEventListener('keydown', handleSlashFocus);
    };
  }, []);

  useEffect(() => {
    if (isLoading || error) {
      return;
    }

    const sections: Array<{ key: string; users: CommunityUser[] }> = [
      { key: 'attending_saved_events', users: highlights.attendingSavedEvents },
      { key: 'network_attending_this_week', users: highlights.networkAttendingThisWeek },
      { key: 'new_members', users: highlights.newMembers },
    ];

    for (const section of sections) {
      if (section.users.length === 0) {
        continue;
      }

      if (highlightImpressionsSentRef.current.has(section.key)) {
        continue;
      }

      highlightImpressionsSentRef.current.add(section.key);
      void sendTelemetryEvent({
        eventType: 'community_highlight_impression',
        context: {
          surface: 'community_page',
        },
        metadata: {
          section: section.key,
          userCount: section.users.length,
          queryLength: normalizedQuery.length,
          hasHeadlineOnly,
        },
      });
    }
  }, [error, hasHeadlineOnly, highlights, isLoading, normalizedQuery.length]);

  const trackHighlightFollowStatus = useCallback((
    sectionKey: string,
    user: CommunityUser,
    isFollowing: boolean
  ) => {
    void sendTelemetryEvent({
      eventType: 'community_highlight_follow_action',
      context: {
        surface: 'community_page',
        section: sectionKey,
      },
      metadata: {
        userId: user.id,
        action: isFollowing ? 'follow' : 'unfollow',
        queryLength: normalizedQuery.length,
        hasHeadlineOnly,
      },
    });
  }, [hasHeadlineOnly, normalizedQuery.length]);

  const trackHighlightProfileClick = useCallback((sectionKey: string, user: CommunityUser) => {
    void sendTelemetryEvent({
      eventType: 'community_highlight_profile_click',
      context: {
        surface: 'community_page',
        section: sectionKey,
      },
      metadata: {
        userId: user.id,
        queryLength: normalizedQuery.length,
        hasHeadlineOnly,
      },
    });
  }, [hasHeadlineOnly, normalizedQuery.length]);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="space-y-4 border-b border-[var(--border-default)] pb-5">
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--foreground-tertiary)]">
            Community
          </p>
          <h1 className="text-2xl font-semibold text-[var(--foreground-primary)]">Find people in your orbit</h1>
          <p className="max-w-2xl text-sm text-[var(--foreground-secondary)]">
            Search public profiles, follow people you want to track, and build your network graph.
          </p>
        </div>

        <div className="grid gap-2 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
          <div className="relative">
            <MagnifyingGlass
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-tertiary)]"
            />
            <input
              ref={searchInputRef}
              value={queryInput}
              onChange={(event) => setQueryInput(event.target.value)}
              placeholder="Search by name, username, or headline"
              maxLength={80}
              className="h-10 w-full rounded-md border border-[var(--border-default)] bg-[var(--background-main)] py-2 pl-9 pr-10 text-sm text-[var(--foreground-primary)] outline-none focus:border-[var(--accent-primary)]"
            />
            {normalizedQuery && (
              <button
                type="button"
                aria-label="Clear search query"
                onClick={() => setQueryInput('')}
                className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-[var(--foreground-tertiary)] hover:bg-[var(--background-elevated)] hover:text-[var(--foreground-primary)]"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <label className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--border-default)] px-3 text-xs text-[var(--foreground-secondary)]">
            <input
              type="checkbox"
              checked={hasHeadlineOnly}
              onChange={(event) => setHasHeadlineOnly(event.target.checked)}
              className="h-4 w-4 rounded border-[var(--border-default)]"
            />
            Has headline only
          </label>

          <label className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--border-default)] px-3 text-xs text-[var(--foreground-secondary)]">
            <span>Sort</span>
            <select
              value={sortMode}
              onChange={(event) => {
                const nextSortMode = event.target.value as CommunitySortMode;
                setSortMode(nextSortMode);
                void sendTelemetryEvent({
                  eventType: 'community_sort_changed',
                  context: {
                    surface: 'community_page',
                  },
                  metadata: {
                    sortMode: nextSortMode,
                    queryLength: normalizedQuery.length,
                    hasHeadlineOnly,
                  },
                });
              }}
              className="min-w-[110px] bg-transparent text-xs text-[var(--foreground-primary)] outline-none"
            >
              <option value="newest">Newest</option>
              <option value="popular">Most followed</option>
              <option value="active">Most active</option>
            </select>
          </label>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!hasActiveFilters}
            onClick={() => {
              setQueryInput('');
              setHasHeadlineOnly(false);
            }}
            className="h-10 text-xs"
          >
            Clear
          </Button>
        </div>

        <p className="text-xs text-[var(--foreground-tertiary)]">{resultLabel}</p>
        <p className="text-[11px] text-[var(--foreground-tertiary)]">Tip: press / to focus search.</p>
      </header>

      <section className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div>
          {isLoading ? (
            <div>
              <div className="mb-3 flex items-center gap-2 text-sm text-[var(--foreground-secondary)]">
                <CircleNotchIcon className="h-4 w-4 animate-spin" />
                Loading people...
              </div>
              <ul className="divide-y divide-[var(--border-default)] border-y border-[var(--border-default)]">
                {Array.from({ length: 6 }).map((_, index) => (
                  <li key={index} className="py-4">
                    <div className="flex items-start gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <Skeleton className="h-3 w-28" />
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-3 w-3/4" />
                      </div>
                      <Skeleton className="h-7 w-16 rounded-md" />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : error ? (
            <p className="text-sm text-[var(--error)]">{error}</p>
          ) : users.length === 0 ? (
            <div className="space-y-2 py-2">
              <p className="text-sm font-medium text-[var(--foreground-primary)]">
                {hasActiveFilters ? 'No users matched this search.' : 'No public profiles yet.'}
              </p>
              <p className="text-sm text-[var(--foreground-secondary)]">
                {hasActiveFilters
                  ? 'Try a shorter query or remove the headline filter.'
                  : 'Profiles appear here after users set a username and choose public visibility.'}
              </p>
              <div className="pt-1">
                {hasActiveFilters ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setQueryInput('');
                      setHasHeadlineOnly(false);
                    }}
                  >
                    Reset search
                  </Button>
                ) : (
                  <Button asChild size="sm" variant="secondary">
                    <Link href="/dashboard/settings">Open profile settings</Link>
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              {hasHighlights ? (
                <div className="mb-6 space-y-5 border-b border-[var(--border-default)] pb-5">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--foreground-tertiary)]">
                    From your activity
                  </h2>

                  <CommunityHighlightList
                    sectionKey="attending_saved_events"
                    title="People attending events you saved"
                    users={highlights.attendingSavedEvents}
                    telemetrySurface="community_highlight_saved_events"
                    activityHint={(user) =>
                      `${pluralize(user.activity.sharedSavedEventCount, 'shared saved event')} · ${pluralize(user.activity.upcomingAttendingCount, 'upcoming event')}`
                    }
                    onProfileClick={trackHighlightProfileClick}
                    onFollowStatusChange={trackHighlightFollowStatus}
                  />

                  <CommunityHighlightList
                    sectionKey="network_attending_this_week"
                    title="People in your network attending this week"
                    users={highlights.networkAttendingThisWeek}
                    telemetrySurface="community_highlight_network_week"
                    activityHint={(user) =>
                      `${pluralize(user.activity.attendingThisWeekCount, 'event')} this week`
                    }
                    onProfileClick={trackHighlightProfileClick}
                    onFollowStatusChange={trackHighlightFollowStatus}
                  />

                  <CommunityHighlightList
                    sectionKey="new_members"
                    title="New members this week"
                    users={highlights.newMembers}
                    telemetrySurface="community_highlight_new_members"
                    activityHint={(user) => formatRelativeJoinDate(user.joinedAt)}
                    onProfileClick={trackHighlightProfileClick}
                    onFollowStatusChange={trackHighlightFollowStatus}
                  />
                </div>
              ) : null}

              <ul className="divide-y divide-[var(--border-default)] border-y border-[var(--border-default)]">
                {sortedUsers.map((user) => (
                  <CommunityUserRow
                    key={user.id}
                    user={user}
                    telemetrySurface="community_directory_row"
                  />
                ))}
              </ul>

              {nextCursor && (
                <div className="pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs"
                    disabled={isLoadingMore}
                    onClick={() => {
                      void fetchUsers({ cursor: nextCursor, append: true });
                    }}
                  >
                    {isLoadingMore ? (
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
        </div>

        <aside className="space-y-6 border-t border-[var(--border-default)] pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <section>
            <div className="flex items-center gap-2">
              <Sparkle size={14} className="text-[var(--foreground-tertiary)]" />
              <h2 className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--foreground-tertiary)]">
                Suggested
              </h2>
            </div>

            {suggestedUsers.length === 0 ? (
              <p className="mt-2 text-xs text-[var(--foreground-secondary)]">No suggestions yet.</p>
            ) : (
              <ul className="mt-2 divide-y divide-[var(--border-default)] border-y border-[var(--border-default)]">
                {suggestedUsers.map((user) => (
                  <CommunityUserRow
                    key={`suggested-${user.id}`}
                    user={user}
                    telemetrySurface="community_suggested_user"
                  />
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--foreground-tertiary)]">
              Get discovered
            </h2>
            <ul className="space-y-1 text-xs text-[var(--foreground-secondary)]">
              <li>Set a unique username.</li>
              <li>Add a concise headline.</li>
              <li>Make your profile public.</li>
            </ul>
            <Button asChild variant="link" size="sm" className="h-6 px-0 text-xs">
              <Link href="/dashboard/settings">Edit social profile</Link>
            </Button>
          </section>
        </aside>
      </section>
    </main>
  );
}
