'use client';

import Link from 'next/link';
import { ChatCircle, TrendUp } from '@phosphor-icons/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { CommunityFeedPost } from '@/types/community';
import { buildCirclePostPath, parseCirclePostContent } from '@/utils/circlePosts';

function timeAgo(dateStr: string): string {
    const diffMs = Date.now() - Date.parse(dateStr);
    const mins = Math.max(0, Math.floor(diffMs / 60000));
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

interface FeedPostItemProps {
    post: CommunityFeedPost;
    variant?: 'list' | 'card' | 'featured';
}

export default function FeedPostItem({ post, variant = 'list' }: FeedPostItemProps) {
    const initials = (post.author.fullName || 'U').slice(0, 2).toUpperCase();
    const parsedContent = parseCirclePostContent(post.content ?? '');
    const title = parsedContent.title || parsedContent.body;
    const excerpt = parsedContent.excerpt;
    const postHref = buildCirclePostPath(post.circle.slug, post.id);

    if (variant === 'featured') {
        return (
            <Link
                href={postHref}
                className="group relative block overflow-hidden rounded-[30px] bg-[var(--background-secondary)]/78 p-7 ring-1 ring-[var(--border-default)]/60 shadow-[0_12px_40px_rgba(0,0,0,0.06)] transition-transform duration-200 hover:-translate-y-1 hover:bg-[var(--background-secondary)]/92"
            >
                <div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--foreground-tertiary)]">
                        <span className="rounded-full border border-[var(--border-default)] bg-[var(--background-main)]/60 px-3 py-1">
                            Lead conversation
                        </span>
                        <span className="rounded-full border border-[var(--border-default)] bg-[var(--background-main)]/60 px-3 py-1">
                            {post.circle.name}
                        </span>
                        {post.isTrending && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-default)] bg-[var(--background-main)]/70 px-3 py-1 text-[var(--foreground-primary)]">
                                <TrendUp size={12} weight="bold" />
                                Trending
                            </span>
                        )}
                    </div>

                    <h3 className="mt-5 max-w-4xl text-3xl font-semibold leading-tight text-[var(--foreground-primary)] transition-colors duration-200 group-hover:text-[var(--accent-primary)]">
                        {title}
                    </h3>

                    {excerpt && (
                        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--foreground-secondary)] line-clamp-3">
                            {excerpt}
                        </p>
                    )}

                    <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-[var(--foreground-secondary)]">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border border-[var(--border-default)]/20 shrink-0">
                                <AvatarImage src={post.author.avatarUrl || ''} alt={post.author.fullName || 'User'} />
                                <AvatarFallback className="text-xs bg-[var(--background-tertiary)] text-[var(--foreground-secondary)] font-medium">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-medium text-[var(--foreground-primary)]">
                                    {post.author.fullName || 'Anonymous'}
                                </p>
                                <p className="text-[13px] text-[var(--foreground-tertiary)]">
                                    {timeAgo(post.createdAt)}
                                </p>
                            </div>
                        </div>

                        {post.commentCount > 0 && (
                            <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--background-main)]/60 px-3 py-1 text-[13px]">
                                <ChatCircle size={14} weight="bold" />
                                <span>{post.commentCount} replies</span>
                            </div>
                        )}
                    </div>
                </div>
            </Link>
        );
    }

    if (variant === 'card') {
        return (
            <Link
                href={postHref}
                className="group relative flex h-full flex-col rounded-[24px] bg-[var(--background-secondary)]/32 p-5 ring-1 ring-[var(--border-default)]/45 transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[var(--background-secondary)]/44"
            >
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-[var(--foreground-tertiary)]">
                            <span>{post.circle.name}</span>
                            <span>•</span>
                            <span>{timeAgo(post.createdAt)}</span>
                        </div>
                        <h3 className="mt-3 text-lg font-semibold leading-snug text-[var(--foreground-primary)] transition-colors duration-200 group-hover:text-[var(--accent-primary)] line-clamp-3">
                            {title}
                        </h3>
                    </div>

                    <Avatar className="h-10 w-10 border border-[var(--border-default)]/20 shrink-0">
                        <AvatarImage src={post.author.avatarUrl || ''} alt={post.author.fullName || 'User'} />
                        <AvatarFallback className="text-[10px] bg-[var(--background-tertiary)] text-[var(--foreground-secondary)] font-medium">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                </div>

                {excerpt && (
                    <p className="mt-4 text-sm leading-6 text-[var(--foreground-secondary)] line-clamp-3">
                        {excerpt}
                    </p>
                )}

                <div className="mt-5 flex items-center justify-between gap-3 text-sm text-[var(--foreground-secondary)]">
                    <span className="truncate">
                        {post.author.fullName || 'Anonymous'}
                    </span>
                    <div className="flex items-center gap-3 shrink-0">
                        {post.commentCount > 0 && (
                            <span className="inline-flex items-center gap-1.5">
                                <ChatCircle size={14} weight="bold" />
                                {post.commentCount}
                            </span>
                        )}
                        {post.isTrending && (
                            <span className="inline-flex items-center gap-1 text-emerald-300">
                                <TrendUp size={13} weight="bold" />
                                Hot
                            </span>
                        )}
                    </div>
                </div>
            </Link>
        );
    }

    return (
        <Link
            href={postHref}
            className="group relative flex items-start gap-4 border-b border-[var(--border-default)]/12 px-6 py-5 transition-all duration-200 hover:bg-[var(--background-secondary)]/18"
        >
            {/* Avatar */}
            <Avatar className="h-9 w-9 border border-[var(--border-default)]/20 shrink-0">
                <AvatarImage src={post.author.avatarUrl || ''} alt={post.author.fullName || 'User'} />
                <AvatarFallback className="text-[10px] bg-[var(--background-tertiary)] text-[var(--foreground-secondary)] font-medium">
                    {initials}
                </AvatarFallback>
            </Avatar>

            {/* Content */}
            <div className="flex-1 min-w-0 pr-20">
                {/* Title */}
                <h3 className="text-[15px] font-bold text-[var(--foreground-primary)] leading-snug group-hover:text-[var(--accent-primary)] transition-colors duration-200">
                    {title}
                </h3>

                {/* Meta row */}
                <div className="flex items-center gap-1.5 mt-1.5 text-[12px] text-[var(--foreground-tertiary)] font-medium">
                    <span className="text-[var(--foreground-secondary)]">{post.author.fullName || 'Anonymous'}</span>
                    <span>·</span>
                    <span>{post.circle.name}</span>
                    <span>·</span>
                    <span>{timeAgo(post.createdAt)}</span>
                </div>

                {/* Reply count */}
                {post.commentCount > 0 && (
                    <div className="flex items-center gap-1.5 mt-2.5 text-[12px] text-[var(--foreground-tertiary)] font-medium">
                        <ChatCircle size={14} weight="bold" />
                        <span>{post.commentCount}</span>
                    </div>
                )}
            </div>

            {/* Trending badge */}
            {post.isTrending && (
                <span className="absolute right-6 top-5 inline-flex items-center gap-1 rounded-full bg-[var(--background-secondary)]/70 px-3 py-1 text-[10px] font-bold text-[var(--foreground-secondary)] ring-1 ring-[var(--border-default)]/25">
                    <TrendUp size={12} weight="bold" />
                    Trending
                </span>
            )}
        </Link>
    );
}
