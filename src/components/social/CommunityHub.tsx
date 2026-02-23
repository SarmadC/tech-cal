'use client';

import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    MagnifyingGlass,
    CaretRight,
    CalendarBlank,
    MapPin,
    Monitor,
    CheckCircle,
    UsersThree,
    Command,
} from '@phosphor-icons/react';
import { useSnackbar } from '@/contexts/SnackbarContext';
import FeedPostItem from '@/components/social/FeedPostItem';
import CircleDiscoverCard from '@/components/social/CircleDiscoverCard';
import MemberSuggestionRow from '@/components/social/MemberSuggestionRow';
import { MaterialIcon, type IconName } from '@/components/ui/Icon';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import type { CommunityHubData } from '@/types/community';

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
}

export default function CommunityHub({ data }: CommunityHubProps) {
    const router = useRouter();
    const { showSuccess, showError } = useSnackbar();
    const [searchQuery, setSearchQuery] = useState('');
    const [isJoiningCircle, setIsJoiningCircle] = useState<Record<string, boolean>>({});
    const searchInputRef = useRef<HTMLInputElement>(null);
    const discoverScrollRef = useRef<HTMLDivElement>(null);

    // ── ⌘K keyboard shortcut ─────────────────────────────────────

    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

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

    // ── Search ───────────────────────────────────────────────────

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/community?q=${encodeURIComponent(searchQuery.trim())}`);
        }
    };

    return (
        <div className="max-w-[1280px] mx-auto px-6 py-8">
            {/* ── Breadcrumbs ───────────────────────────────── */}
            <Breadcrumbs trail={[{ label: 'Community', href: '/community' }]} />

            {/* ── Header ──────────────────────────────────────── */}
            <header className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-10">
                <h2 className="text-[22px] font-bold text-[var(--foreground-primary)] tracking-tight">
                    Community
                </h2>

                {/* Header search bar */}
                <form onSubmit={handleSearch} className="relative w-full sm:w-[400px]">
                    <MagnifyingGlass
                        size={18}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--foreground-tertiary)]"
                    />
                    <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search or jump to..."
                        className="w-full h-10 pl-11 pr-16 rounded-xl bg-[var(--background-secondary)]/40 border border-[var(--border-default)]/10 text-sm text-[var(--foreground-primary)] placeholder:text-[var(--foreground-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/20 focus:bg-[var(--background-secondary)] transition-all duration-200"
                    />
                    {/* ⌘K badge */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-[var(--foreground-tertiary)] font-bold">
                        <kbd className="inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded bg-[var(--background-tertiary)] border border-[var(--border-default)]/20 shadow-sm opacity-60">
                            <Command size={10} />
                        </kbd>
                        <kbd className="inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded bg-[var(--background-tertiary)] border border-[var(--border-default)]/20 shadow-sm opacity-60">
                            K
                        </kbd>
                    </div>
                </form>
            </header>

            {/* ── Main Layout Grid ───────────────────────────── */}
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 items-start">

                {/* ── Left Column: Feed + Discovery ─────────────── */}
                <div className="lg:col-span-8 space-y-12">
                    {/* ── FEED (FOR YOU) ────────────────────── */}
                    <section>
                        <div className="flex items-center gap-2 mb-4 px-1">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-tertiary)]">
                                For you
                            </h3>
                        </div>
                        <div className="bg-[var(--background-primary)]">
                            {data.feed.length > 0 ? (
                                data.feed.map((post) => (
                                    <FeedPostItem key={post.id} post={post} />
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-center px-6 border rounded-2xl border-dashed border-[var(--border-default)]/20">
                                    <div className="h-14 w-14 rounded-2xl bg-[var(--background-tertiary)] flex items-center justify-center mb-5">
                                        <UsersThree size={28} className="text-[var(--foreground-tertiary)]" />
                                    </div>
                                    <h4 className="text-base font-semibold text-[var(--foreground-secondary)] mb-2">
                                        Your feed is quiet
                                    </h4>
                                    <p className="text-sm text-[var(--foreground-tertiary)] max-w-[280px] leading-relaxed">
                                        Join more circles to see active discussions and trending topics.
                                    </p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* ── DISCOVER CIRCLES ─────────────────────── */}
                    {discoverCircles.length > 0 && (
                        <section className="pt-4 border-t border-[var(--border-default)]/10">
                            <div className="flex items-center justify-between mb-5 px-1">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-tertiary)]">
                                    Discover circles
                                </h3>
                            </div>
                            <div
                                ref={discoverScrollRef}
                                className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1 scrollbar-hide"
                            >
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
                </div>

                {/* ── Right Column: Sidebar Rail ───────────────── */}
                <aside className="lg:col-span-4 space-y-10 lg:sticky lg:top-24">

                    {/* ── NEXT UP ────────────────────────────── */}
                    <section>
                        <div className="flex items-center justify-between mb-3 px-1">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-tertiary)]">
                                Next up
                            </h3>
                        </div>
                        <div className="rounded-2xl border border-[var(--border-default)]/20 bg-[var(--background-secondary)]/10 p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-[13px] font-medium text-[var(--foreground-secondary)]">Profile completion</span>
                                <span className="text-[13px] font-bold text-[var(--foreground-primary)]">{completedCount}/{totalCount}</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-[var(--background-tertiary)] overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-blue-500 transition-all duration-700 ease-out"
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>

                            {nextTask && (
                                <Link
                                    href={nextTask.ctaHref}
                                    className="flex items-center justify-between bg-[var(--background-primary)] p-4 rounded-xl border border-[var(--border-default)]/20 shadow-sm hover:shadow-md hover:border-[var(--border-default)]/40 transition-all duration-200 group"
                                >
                                    <div className="min-w-0">
                                        <p className="text-[14px] font-bold text-[var(--foreground-primary)] leading-none mb-1.5">
                                            {nextTask.title}
                                        </p>
                                        <p className="text-[12px] text-[var(--foreground-tertiary)] leading-snug">
                                            {nextTask.description}
                                        </p>
                                    </div>
                                    <CaretRight
                                        size={18}
                                        className="text-[var(--foreground-tertiary)] group-hover:text-[var(--foreground-primary)] group-hover:translate-x-1 transition-all duration-200"
                                    />
                                </Link>
                            )}
                        </div>
                    </section>

                    {/* ── MY CIRCLES ────────────────────────── */}
                    {myCircles.length > 0 && (
                        <section>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-tertiary)] mb-4 px-1">
                                My circles
                            </h3>
                            <div className="space-y-1">
                                {myCircles.map((circle) => (
                                    <Link
                                        key={circle.id}
                                        href={circle.href}
                                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[var(--background-secondary)]/40 transition-all duration-200 group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${getSidebarCircleColor(circle.name)}`}>
                                                <MaterialIcon name={getCircleIcon(circle.name, circle.icon)} size={14} className="text-white" />
                                            </div>
                                            <span className="text-[14px] font-bold text-[var(--foreground-secondary)] group-hover:text-[var(--foreground-primary)] transition-colors">
                                                {circle.name}
                                            </span>
                                        </div>
                                        {/* Activity count mockup */}
                                        <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-[10px] font-bold text-white shadow-sm tabular-nums">
                                            {Math.floor(Math.random() * 15) + 1}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* ── UPCOMING EVENTS ──────────────────── */}
                    {data.upcomingEvents.length > 0 && (
                        <section>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-tertiary)] mb-4 px-1">
                                My upcoming events
                            </h3>
                            <div className="space-y-2">
                                {data.upcomingEvents.map((event) => {
                                    const { day, month } = formatEventDay(event.startTime);
                                    return (
                                        <Link
                                            key={event.id}
                                            href={`/events/${event.slug}`}
                                            className="flex items-start gap-4 p-3 rounded-2xl hover:bg-[var(--background-secondary)]/40 hover:-translate-y-0.5 transition-all duration-200 group"
                                        >
                                            {/* Vertical date badge */}
                                            <div className="flex flex-col items-center shrink-0 w-12 h-12 rounded-xl bg-[var(--background-secondary)]/40 border border-[var(--border-default)]/20 justify-center shadow-sm">
                                                <span className="text-lg font-bold text-[var(--foreground-primary)] leading-none">
                                                    {day}
                                                </span>
                                                <span className="text-[9px] font-black uppercase text-[var(--foreground-tertiary)] mt-0.5 tracking-tighter">
                                                    {month}
                                                </span>
                                            </div>

                                            {/* Event Info */}
                                            <div className="min-w-0">
                                                <p className="text-[14px] font-bold text-[var(--foreground-primary)] group-hover:text-[var(--accent-primary)] transition-colors mb-1.5 line-clamp-1">
                                                    {event.title}
                                                </p>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--foreground-tertiary)]">
                                                        <CalendarBlank size={12} weight="bold" />
                                                        <span>{formatEventTime(event.startTime)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--foreground-tertiary)]">
                                                        {event.format === 'virtual' ? <Monitor size={12} weight="bold" /> : <MapPin size={12} weight="bold" />}
                                                        <span className="truncate">{event.location || 'Virtual'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </section>
                    )}
                </aside>
            </div>
        </div>
    );
}
