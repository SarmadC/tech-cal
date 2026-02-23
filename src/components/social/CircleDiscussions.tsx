'use client';

import { useMemo, useState } from 'react';
import { MagnifyingGlass, CaretDown, ChatCircle } from '@phosphor-icons/react';
import CreatePost from './CreatePost';
import PostFeedItem, { PostType } from './PostFeedItem';

interface CircleDiscussionsProps {
    circleId: string;
    circleSlug: string;
    isJoined: boolean;
    currentUser: {
        id: string;
        fullName?: string | null;
        avatarUrl?: string | null;
    } | null;
    posts: PostType[];
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

    const sortedPosts = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase();
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
    }, [posts, searchQuery, sortBy]);

    return (
        <section className="w-full">
            <div className="mb-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="pt-0.5">
                        <h2 className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">
                            Discussions
                        </h2>
                    </div>

                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                        <label className="relative block w-full sm:w-[220px]">
                            <span className="sr-only">Search discussions</span>
                            <MagnifyingGlass
                                size={14}
                                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
                            />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search discussions"
                                className="h-9 w-full rounded-md border border-zinc-300/60 dark:border-zinc-700 bg-zinc-50/70 dark:bg-zinc-900/70 pl-7 pr-2 text-[13px] text-zinc-700 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-300/40 dark:focus:ring-zinc-600/40"
                            />
                        </label>

                        <button
                            type="button"
                            onClick={() => setSortBy(prev => prev === 'new' ? 'top' : 'new')}
                            className="inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-zinc-300/60 dark:border-zinc-700 bg-zinc-50/70 dark:bg-zinc-900/70 px-2.5 text-[13px] font-medium text-zinc-600 dark:text-zinc-300 transition-colors hover:text-zinc-900 hover:border-zinc-400/70 dark:hover:text-zinc-100 dark:hover:border-zinc-600"
                        >
                            Sort: {sortBy === 'new' ? 'Latest' : 'Top'}
                            <CaretDown size={12} weight="bold" className="text-zinc-400 dark:text-zinc-500" />
                        </button>
                    </div>
                </div>
            </div>

            {isJoined && currentUser ? (
                <CreatePost
                    circleId={circleId}
                    circleSlug={circleSlug}
                    currentUser={currentUser}
                />
            ) : (
                <div className="mb-8 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-zinc-900/40 px-4 py-5 text-center">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Join this circle to participate in the discussion.
                    </p>
                </div>
            )}

            {sortedPosts.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-[#0f1012]/90 py-12 text-center">
                    <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                        <ChatCircle size={20} weight="light" />
                    </div>
                    <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">No discussions yet</h3>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Be the first to start a conversation.
                    </p>
                </div>
            ) : (
                <div className="space-y-12">
                    {sortedPosts.map(post => (
                        <PostFeedItem
                            key={post.id}
                            post={post}
                            circleSlug={circleSlug}
                            currentUser={currentUser}
                            isJoined={isJoined}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
