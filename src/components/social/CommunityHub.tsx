'use client';

import { useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    MagnifyingGlass,
    CaretRight,
    CalendarBlank,
    MapPin,
    Monitor,
    UsersThree,
} from '@phosphor-icons/react';
import { useSnackbar } from '@/contexts/SnackbarContext';
import FeedPostItem from '@/components/social/FeedPostItem';
import CircleDiscoverCard from '@/components/social/CircleDiscoverCard';
import { MaterialIcon, type IconName } from '@/components/ui/Icon';
import type { CommunityHubData, CommunityTab } from '@/types/community';

// Derive a unique accent color from circle name (matches CircleDiscoverCard)
const SIDEBAR_CIRCLE_COLORS = [
    'bg-blue-500',
    'bg-purple-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-cyan-500',
    'bg-indigo-500',
    'bg-pink-500',
];

function getSidebarCircleColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return SIDEBAR_CIRCLE_COLORS[Math.abs(hash) % SIDEBAR_CIRCLE_COLORS.length];
}

// Derive a meaningful Phosphor icon from circle name keywords
const CIRCLE_NAME_ICON_MAP: [string[], IconName][] = [
    [['product', 'manager', 'pm'], 'work'],
    [['engineering', 'engineer', 'backend', 'infra'], 'code'],
    [['frontend', 'web', 'ui', 'css', 'html'], 'code'],
    [['ai', 'ml', 'machine learning', 'data', 'llm'], 'sparkle'],
    [['design', 'ux', 'figma', 'creative', 'visual'], 'palette'],
    [['startup', 'founder', 'entrepreneur', 'vc'], 'trophy'],
    [['mobile', 'ios', 'android', 'flutter'], 'devices'],
    [['security', 'cyber', 'hack', 'devsecops'], 'globe'],
    [['cloud', 'devops', 'platform', 'infra', 'sre'], 'extension'],
    [['open source', 'foss', 'linux', 'community'], 'globe'],
    [['gaming', 'game', 'unity', 'unreal'], 'game-controller'],
    [['audio', 'podcast', 'voice', 'speaker'], 'microphone'],
    [['photo', 'camera', 'video', 'media', 'film'], 'camera'],
    [['science', 'research', 'lab', 'bio', 'chem'], 'flask'],
    [['book', 'learn', 'education', 'course'], 'books'],
    [['health', 'wellness', 'mental', 'fitness'], 'heart'],
    [['web3', 'crypto', 'blockchain', 'nft', 'defi'], 'globe'],
    [['marketing', 'growth', 'seo', 'content'], 'trending-up'],
    [['hardware', 'embedded', 'iot', 'robotics'], 'extension'],
];

function getCircleIcon(name: string, dbIcon?: string): IconName {
    // Prefer the database-stored icon if available
    if (dbIcon && dbIcon !== 'people') return dbIcon as IconName;
    const lower = name.toLowerCase();
    for (const [keywords, icon] of CIRCLE_NAME_ICON_MAP) {
        if (keywords.some((kw) => lower.includes(kw))) return icon;
    }
    return 'users-three';
}

// ── Helpers ──────────────────────────────────────────────────────

function formatEventTime(dateStr: string): string {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    }).format(d);
}

function formatEventDay(dateStr: string): { day: string; month: string } {
    const d = new Date(dateStr);
    return {
        day: d.getDate().toString(),
        month: new Intl.DateTimeFormat('en-US', { month: 'short' }).format(d).toUpperCase(),
    };
}

// ── Component ────────────────────────────────────────────────────

interface CommunityHubProps {
    data: CommunityHubData;
    activeTab: Exclude<CommunityTab, 'directory'>;
}

export default function CommunityHub({ data, activeTab }: CommunityHubProps) {
    const router = useRouter();
    const { showSuccess, showError } = useSnackbar();
    const [isJoiningCircle, setIsJoiningCircle] = useState<Record<string, boolean>>({});

    // ── Circles ──────────────────────────────────────────────────

    const myCircles = useMemo(
        () => data.circles.filter((c) => c.isJoined),
        [data.circles]
    );
    const discoverCircles = useMemo(
        () => data.circles.filter((c) => !c.isJoined),
        [data.circles]
    );

    const handleCircleToggle = useCallback(
        async (circleId: string, isCurrentlyJoined: boolean) => {
            if (isJoiningCircle[circleId]) return;

            try {
                setIsJoiningCircle((prev) => ({ ...prev, [circleId]: true }));
                const method = isCurrentlyJoined ? 'DELETE' : 'POST';
                const res = await fetch(`/api/community/circles/${circleId}/join`, { method });
                if (!res.ok) throw new Error('Failed');
                showSuccess(isCurrentlyJoined ? 'Left circle.' : 'Joined circle!');
                router.refresh();
            } catch (err) {
                showError(isCurrentlyJoined ? 'Could not leave circle.' : 'Could not join circle.');
                throw err; // Re-throw so CircleDiscoverCard can revert its optimistic state
            } finally {
                setIsJoiningCircle((prev) => ({ ...prev, [circleId]: false }));
            }
        },
        [isJoiningCircle, router, showSuccess, showError]
    );

    // ── Progress ─────────────────────────────────────────────────

    const completedCount = data.progress.tasks.filter((t) => t.completed).length;
    const totalCount = data.progress.tasks.length;
    const nextTask = data.progress.tasks.find((t) => !t.completed) || null;
    const progressPercent = data.progress.completionPercent;
    const leadPost = data.feed[0] ?? null;
    const secondaryPosts = data.feed.slice(1, 5);
    const remainingPosts = data.feed.slice(5);

    return (
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.9fr)_320px] lg:items-start lg:gap-12">
            <div className="space-y-8">
                {activeTab === 'feed' ? (
                    <>
                        <section>
                            <div className="flex items-start justify-between gap-6 border-b border-[var(--border-default)]/70 pb-5">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.22em] text-[var(--foreground-tertiary)]">
                                        Feed
                                    </p>
                                    <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground-primary)]">
                                        Conversations from your circles
                                    </h2>
                                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--foreground-secondary)]">
                                        Lead with the biggest thread, skim the rest in cards, then drop into the full stream only when you want more context.
                                    </p>
                                </div>
                                <div className="hidden rounded-full border border-[var(--border-default)]/70 bg-[var(--background-secondary)]/45 px-3 py-1 text-xs font-medium text-[var(--foreground-secondary)] md:inline-flex">
                                    {data.feed.length} recent posts
                                </div>
                            </div>

                            <div className="mt-6">
                                {data.feed.length > 0 ? (
                                    <div className="space-y-6">
                                        {leadPost && <FeedPostItem post={leadPost} variant="featured" />}

                                        {secondaryPosts.length > 0 && (
                                            <div>
                                                <div className="mb-4 flex items-center justify-between">
                                                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground-tertiary)]">
                                                        Worth a skim
                                                    </p>
                                                    <p className="text-xs text-[var(--foreground-tertiary)]">
                                                        {secondaryPosts.length} quick reads
                                                    </p>
                                                </div>
                                                <div className="grid gap-4 md:grid-cols-2">
                                                    {secondaryPosts.map((post) => (
                                                        <FeedPostItem key={post.id} post={post} variant="card" />
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {remainingPosts.length > 0 && (
                                            <div className="border-t border-[var(--border-default)]/70 pt-6">
                                                <div className="flex items-center justify-between pb-4">
                                                    <div>
                                                        <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground-tertiary)]">
                                                            Full stream
                                                        </p>
                                                        <h3 className="mt-1 text-lg font-semibold text-[var(--foreground-primary)]">
                                                            More from your circles
                                                        </h3>
                                                    </div>
                                                    <span className="rounded-full border border-[var(--border-default)]/70 bg-[var(--background-secondary)]/45 px-3 py-1 text-xs font-medium text-[var(--foreground-secondary)]">
                                                        {remainingPosts.length} more
                                                    </span>
                                                </div>
                                                <div>
                                                    {remainingPosts.map((post) => (
                                                        <FeedPostItem key={post.id} post={post} />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                                        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--background-tertiary)]">
                                            <UsersThree size={28} className="text-[var(--foreground-tertiary)]" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-[var(--foreground-primary)]">
                                            Your feed is quiet right now
                                        </h3>
                                        <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--foreground-secondary)]">
                                            Join a few circles to pull more conversations, event chatter, and member updates into this feed.
                                        </p>
                                        <Link
                                            href="/community?tab=circles"
                                            className="mt-6 inline-flex items-center rounded-full bg-[var(--foreground-primary)] px-4 py-2 text-sm font-medium text-[var(--background-main)] transition-opacity hover:opacity-90"
                                        >
                                            Explore circles
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </section>
                    </>
                ) : (
                    <section className="space-y-8">
                        <div className="border-b border-[var(--border-default)]/70 pb-5">
                            <p className="text-xs uppercase tracking-[0.22em] text-[var(--foreground-tertiary)]">
                                Circles
                            </p>
                            <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground-primary)]">
                                Join communities that match how you build
                            </h2>
                            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--foreground-secondary)]">
                                Keep your joined circles in one place, then branch into new ones when you want a different room for the conversation.
                            </p>
                        </div>

                        <section className="border-t border-[var(--border-default)]/70 pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground-tertiary)]">
                                        Joined
                                    </p>
                                    <h3 className="mt-2 text-xl font-semibold text-[var(--foreground-primary)]">
                                        Your current circles
                                    </h3>
                                </div>
                                <span className="rounded-full border border-[var(--border-default)] bg-[var(--background-main)] px-3 py-1 text-xs font-medium text-[var(--foreground-secondary)]">
                                    {myCircles.length} joined
                                </span>
                            </div>

                            {myCircles.length > 0 ? (
                                <div className="mt-5 grid gap-4 md:grid-cols-2">
                                    {myCircles.map((circle) => (
                                        <div
                                            key={circle.id}
                                            className="rounded-[24px] bg-[var(--background-secondary)]/42 p-5 ring-1 ring-[var(--border-default)]/60"
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex items-start gap-4">
                                                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${getSidebarCircleColor(circle.name)}`}>
                                                        <MaterialIcon name={getCircleIcon(circle.name, circle.icon)} size={18} className="text-white" />
                                                    </div>
                                                    <div>
                                                        <p className="text-base font-semibold text-[var(--foreground-primary)]">
                                                            {circle.name}
                                                        </p>
                                                        <p className="mt-1 text-sm text-[var(--foreground-secondary)]">
                                                            {circle.description || 'A community circle'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-4 flex items-center justify-between">
                                                <span className="text-xs uppercase tracking-[0.14em] text-[var(--foreground-tertiary)]">
                                                    {new Intl.NumberFormat('en-US').format(circle.memberCount)} members
                                                </span>
                                                <Link
                                                    href={circle.href}
                                                    className="text-sm font-medium text-[var(--foreground-primary)] underline decoration-[var(--border-default)] underline-offset-4"
                                                >
                                                    Open circle
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="mt-5 rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--background-main)]/60 p-8 text-center">
                                    <p className="text-base font-semibold text-[var(--foreground-primary)]">
                                        You have not joined a circle yet.
                                    </p>
                                    <p className="mt-2 text-sm leading-6 text-[var(--foreground-secondary)]">
                                        Start with a small set of communities that match your work, then let your feed fill in from there.
                                    </p>
                                </div>
                            )}
                        </section>

                        {discoverCircles.length > 0 && (
                            <section className="border-t border-[var(--border-default)]/70 pt-6">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground-tertiary)]">
                                        Discover
                                    </p>
                                    <h3 className="mt-2 text-xl font-semibold text-[var(--foreground-primary)]">
                                        More circles to join
                                    </h3>
                                </div>

                                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    {discoverCircles.map((circle) => (
                                        <CircleDiscoverCard
                                            key={circle.id}
                                            circle={circle}
                                            onToggle={handleCircleToggle}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}
                    </section>
                )}
            </div>

            <aside className="space-y-8 border-t border-[var(--border-default)]/70 pt-6 lg:sticky lg:top-24 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                {totalCount > 0 && completedCount < totalCount && (
                    <section>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground-tertiary)]">
                                    Next up
                                </p>
                                <h3 className="mt-2 text-lg font-semibold text-[var(--foreground-primary)]">
                                    Profile momentum
                                </h3>
                            </div>
                            <span className="text-sm font-semibold text-[var(--foreground-primary)]">
                                {completedCount}/{totalCount}
                            </span>
                        </div>

                        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[var(--background-tertiary)]">
                            <div
                                className="h-full rounded-full bg-blue-500 transition-all duration-700 ease-out"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>

                        {nextTask && (
                            <Link
                                href={nextTask.ctaHref}
                                className="group mt-5 flex items-center justify-between border-b border-[var(--border-default)]/55 pb-4 transition-transform duration-200 hover:translate-x-1"
                            >
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-[var(--foreground-primary)]">
                                        {nextTask.title}
                                    </p>
                                    <p className="mt-1 text-xs leading-5 text-[var(--foreground-secondary)]">
                                        {nextTask.description}
                                    </p>
                                </div>
                                <CaretRight
                                    size={18}
                                    className="text-[var(--foreground-tertiary)] transition-all duration-200 group-hover:translate-x-1 group-hover:text-[var(--foreground-primary)]"
                                />
                            </Link>
                        )}
                    </section>
                )}

                <section>
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground-tertiary)]">
                        Events
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-[var(--foreground-primary)]">
                        My upcoming events
                    </h3>

                    {data.upcomingEvents.length > 0 ? (
                        <div className="mt-5 space-y-2">
                            {data.upcomingEvents.map((event) => {
                                const { day, month } = formatEventDay(event.startTime);
                                return (
                                    <Link
                                        key={event.id}
                                        href={`/events/${event.slug}`}
                                        className="group flex items-start gap-4 border-b border-[var(--border-default)]/45 py-3 transition-all duration-200 hover:translate-x-1"
                                    >
                                        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-[var(--background-secondary)]/55 ring-1 ring-[var(--border-default)]/60">
                                            <span className="text-lg font-bold leading-none text-[var(--foreground-primary)]">
                                                {day}
                                            </span>
                                            <span className="mt-0.5 text-[9px] font-black uppercase tracking-tighter text-[var(--foreground-tertiary)]">
                                                {month}
                                            </span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="mb-1.5 line-clamp-1 text-sm font-semibold text-[var(--foreground-primary)] transition-colors group-hover:text-[var(--accent-primary)]">
                                                {event.title}
                                            </p>
                                            <div className="space-y-1 text-[11px] font-medium text-[var(--foreground-tertiary)]">
                                                <div className="flex items-center gap-1.5">
                                                    <CalendarBlank size={12} weight="bold" />
                                                    <span>{formatEventTime(event.startTime)}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    {event.format === 'virtual' ? <Monitor size={12} weight="bold" /> : <MapPin size={12} weight="bold" />}
                                                    <span className="truncate">{event.location || 'Virtual'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="mt-5 border-b border-dashed border-[var(--border-default)]/55 pb-4 text-sm leading-6 text-[var(--foreground-secondary)]">
                            Bookmark an event to keep your next few plans visible here.
                        </div>
                    )}
                </section>

                {activeTab === 'feed' && myCircles.length > 0 && (
                    <section>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground-tertiary)]">
                                    Circles
                                </p>
                                <h3 className="mt-2 text-lg font-semibold text-[var(--foreground-primary)]">
                                    Keep your groups close
                                </h3>
                            </div>
                            <Link
                                href="/community?tab=circles"
                                className="text-sm font-medium text-[var(--foreground-primary)] underline decoration-[var(--border-default)] underline-offset-4"
                            >
                                Manage
                            </Link>
                        </div>

                        <div className="mt-5 space-y-3">
                            {myCircles.slice(0, 4).map((circle) => (
                                <Link
                                    key={circle.id}
                                    href={circle.href}
                                    className="group flex items-center gap-4 border-b border-[var(--border-default)]/45 py-3 transition-transform duration-200 hover:translate-x-1"
                                >
                                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${getSidebarCircleColor(circle.name)}`}>
                                        <MaterialIcon name={getCircleIcon(circle.name, circle.icon)} size={18} className="text-white" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-[var(--foreground-primary)]">
                                            {circle.name}
                                        </p>
                                        <p className="mt-1 text-xs text-[var(--foreground-secondary)]">
                                            {new Intl.NumberFormat('en-US').format(circle.memberCount)} members
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {activeTab === 'circles' && data.suggestedMembers.length > 0 && (
                    <section>
                        <div className="flex items-center gap-2 text-[var(--foreground-primary)]">
                            <MagnifyingGlass size={16} />
                            <h3 className="text-lg font-semibold">Suggested members</h3>
                        </div>

                        <div className="mt-5 space-y-3">
                            {data.suggestedMembers.slice(0, 4).map((member) => (
                                <Link
                                    key={member.id}
                                    href={member.username ? `/u/${member.username}` : '/community'}
                                    className="block border-b border-[var(--border-default)]/45 py-3 transition-transform duration-200 hover:translate-x-1"
                                >
                                    <p className="text-sm font-semibold text-[var(--foreground-primary)]">
                                        {member.fullName || (member.username ? `@${member.username}` : 'Community member')}
                                    </p>
                                    {member.username && (
                                        <p className="mt-1 text-xs text-[var(--foreground-tertiary)]">
                                            @{member.username}
                                        </p>
                                    )}
                                    {member.headline && (
                                        <p className="mt-2 text-xs leading-5 text-[var(--foreground-secondary)] line-clamp-2">
                                            {member.headline}
                                        </p>
                                    )}
                                </Link>
                            ))}
                        </div>
                    </section>
                )}
            </aside>
        </div>
    );
}
