'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { MagnifyingGlass, ChatCircle, CaretDown, Check } from '@phosphor-icons/react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import CreatePost from './CreatePost';
import PostFeedItem from './PostFeedItem';
import type { CircleDiscussionPost } from '@/types/circleDiscussions';

interface CircleDiscussionsProps {
    circleId: string;
    circleSlug: string;
    isJoined: boolean;
    currentUser: {
        id: string;
        fullName?: string | null;
        avatarUrl?: string | null;
    } | null;
    posts: CircleDiscussionPost[];
}

export default function CircleDiscussions({
    circleId,
    circleSlug,
    isJoined,
    currentUser,
    posts
}: CircleDiscussionsProps) {
    const [sortBy, setSortBy] = useState<'new' | 'top'>('new');
    const [searchQuery, setSearchQuery] = useState('');
    const deferredSearchQuery = useDeferredValue(searchQuery);
    const activeSortLabel = sortBy === 'new' ? 'Newest' : 'Top';

    const sortedPosts = useMemo(() => {
        const normalizedQuery = deferredSearchQuery.trim().toLowerCase();
        const filteredPosts = normalizedQuery
            ? posts.filter(post => {
                const content = post.content.toLowerCase();
                const authorName = (post.author?.full_name || '').toLowerCase();

                // Check if query matches post content or author
                if (content.includes(normalizedQuery) || authorName.includes(normalizedQuery)) {
                    return true;
                }

                // Check if query matches any comment content or comment author
                const hasMatchingComment = post.comments?.some(comment => {
                    const commentContent = comment.content.toLowerCase();
                    const commentAuthorName = (comment.author?.full_name || '').toLowerCase();
                    return commentContent.includes(normalizedQuery) || commentAuthorName.includes(normalizedQuery);
                });

                return hasMatchingComment;
            })
            : posts;

        return [...filteredPosts].sort((a, b) => {
            if (sortBy === 'new') {
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }
            return (b.score || 0) - (a.score || 0);
        });
    }, [deferredSearchQuery, posts, sortBy]);

    const hasSearchQuery = deferredSearchQuery.trim().length > 0;

    return (
        <section className="w-full">
            <div className="mb-5 pb-4 md:border-b md:border-zinc-200/80 md:dark:border-zinc-800/80">
                <div className="flex flex-wrap items-center gap-3">
                    <label className="relative block min-w-0 flex-1 lg:max-w-[520px]">
                        <span className="sr-only">Search discussions</span>
                        <MagnifyingGlass
                            size={16}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-tertiary)]"
                        />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search threads or replies"
                            className="h-11 w-full rounded-full border border-[var(--border-default)] bg-[var(--background-secondary)]/70 pl-10 pr-4 text-[14px] text-[var(--foreground-primary)] placeholder:text-[var(--foreground-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--foreground-primary)]/10"
                        />
                    </label>

                    <div className="flex shrink-0 justify-end">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    aria-label={`Sort: ${activeSortLabel}`}
                                    className="inline-flex h-9 w-[106px] items-center justify-between gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--background-secondary)]/60 px-3 text-[13px] text-[var(--foreground-secondary)] transition-colors hover:border-[var(--foreground-tertiary)] hover:text-[var(--foreground-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--foreground-primary)]/10"
                                >
                                    <span className="font-medium text-[var(--foreground-primary)]">
                                        {activeSortLabel}
                                    </span>
                                    <CaretDown size={14} className="text-[var(--foreground-tertiary)]" />
                                </button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent
                                align="end"
                                className="w-40 rounded-2xl border-[var(--border-default)] bg-[var(--background-secondary)]/95 p-1.5 text-[var(--foreground-primary)] shadow-xl backdrop-blur"
                            >
                                {([
                                    ['new', 'Newest'],
                                    ['top', 'Top'],
                                ] as const).map(([value, label]) => (
                                    <DropdownMenuItem
                                        key={value}
                                        onSelect={() => setSortBy(value)}
                                        className="flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-[13px] font-medium text-[var(--foreground-secondary)] focus:bg-[var(--background-main)] focus:text-[var(--foreground-primary)]"
                                    >
                                        <span>{label}</span>
                                        {sortBy === value ? (
                                            <Check size={14} className="text-[var(--foreground-tertiary)]" />
                                        ) : null}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {hasSearchQuery ? (
                        <p className="basis-full text-[13px] text-zinc-500 dark:text-zinc-400">
                            {`Showing ${sortedPosts.length} result${sortedPosts.length === 1 ? '' : 's'} for "${deferredSearchQuery.trim()}".`}
                        </p>
                    ) : null}
                </div>
            </div>

            {isJoined && currentUser ? (
                <CreatePost
                    circleId={circleId}
                    circleSlug={circleSlug}
                    currentUser={currentUser}
                />
            ) : null}

            {sortedPosts.length === 0 ? (
                <div className="border-y border-zinc-200/80 py-12 text-center dark:border-zinc-800/80">
                    <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                        <ChatCircle size={20} weight="light" />
                    </div>
                    <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                        {hasSearchQuery ? 'No threads match that search' : 'No discussions yet'}
                    </h3>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        {hasSearchQuery ? 'Try a different keyword or clear the search.' : 'Be the first to start a conversation.'}
                    </p>
                </div>
            ) : (
                <div className="divide-y divide-zinc-200/80 dark:divide-zinc-800/80">
                    {sortedPosts.map(post => (
                        <PostFeedItem
                            key={post.id}
                            post={post}
                            circleSlug={circleSlug}
                            currentUser={currentUser}
                            isJoined={isJoined}
                            showPermalink={true}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
