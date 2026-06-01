'use client';

import Link from 'next/link';
import { ChatCircle, TrendUp } from '@phosphor-icons/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { CommunityFeedPost } from '@/types/community';
import { buildCirclePostPath, parseCirclePostContent } from '@/utils/circlePosts';
import {
    formatCommunityCircleName,
    getCommunityCircleTextColor,
} from '@/components/social/community-hub-shared';

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
    surface?: 'default' | 'flat';
}

export default function FeedPostItem({
    post,
    variant = 'list',
    surface = 'default',
}: FeedPostItemProps) {
    const initials = (post.author.fullName || 'U').slice(0, 2).toUpperCase();
    const parsedContent = parseCirclePostContent(post.content ?? '');
    const title = post.title || parsedContent.title || parsedContent.body;
    const excerpt = post.title ? post.content : parsedContent.excerpt;
    const postHref = buildCirclePostPath(post.circle.slug, post.id, post.content);
    const replyLabel = post.commentCount > 0
        ? `${post.commentCount} ${post.commentCount === 1 ? 'reply' : 'replies'}`
        : 'Fresh thread';

    const authorName = post.author.fullName || 'Anonymous';
    const circleName = formatCommunityCircleName(post.circle.name);
    const isFlatSurface = surface === 'flat';

    if (variant === 'featured') {
        return (
            <Link
                href={postHref}
                className={cn(
                    'group relative block transition-all duration-200',
                    isFlatSurface
                        ? 'pb-8'
                        : 'overflow-hidden rounded-[30px] border border-zinc-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,244,245,0.9))] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] hover:-translate-y-1 hover:border-zinc-300/80 dark:border-zinc-800 dark:bg-[linear-gradient(180deg,rgba(24,24,27,0.92),rgba(9,9,11,0.92))] dark:shadow-[0_24px_60px_rgba(0,0,0,0.35)]'
                )}
            >
                {!isFlatSurface ? (
                    <div className="absolute inset-x-0 top-0 h-20 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.14),transparent_58%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.12),transparent_58%)]" />
                ) : null}
                <div className="relative">
                    <div className="flex flex-wrap items-center justify-end gap-3">
                        <div className="flex flex-wrap items-center gap-3 text-[12px] font-medium text-zinc-500 dark:text-zinc-400">
                            <span className={cn(
                                'inline-flex items-center gap-1.5',
                                !isFlatSurface && 'rounded-full border border-zinc-200/80 bg-white/80 px-3 py-1.5 dark:border-zinc-800 dark:bg-zinc-950/50'
                            )}>
                                <ChatCircle size={14} weight="bold" />
                                {replyLabel}
                            </span>
                            {post.isTrending && (
                                <span className={cn(
                                    'inline-flex items-center gap-1.5 text-orange-700 dark:text-orange-200',
                                    !isFlatSurface && 'rounded-full border border-orange-200/70 bg-orange-50/90 px-3 py-1.5 dark:border-orange-500/30 dark:bg-orange-500/12'
                                )}>
                                    <TrendUp size={14} weight="bold" />
                                    Trending
                                </span>
                            )}
                        </div>
                    </div>

                    <div className={cn('flex items-start gap-4', isFlatSurface ? 'mt-7' : 'mt-6')}>
                        <Avatar className="h-12 w-12 shrink-0 border border-zinc-200/70 dark:border-zinc-700/80">
                            <AvatarImage src={post.author.avatarUrl || ''} alt={authorName} />
                            <AvatarFallback className="bg-zinc-100 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                {initials}
                            </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-zinc-500 dark:text-zinc-400">
                                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                    {authorName}
                                </span>
                                <span className="text-zinc-300 dark:text-zinc-700">&middot;</span>
                                <span>
                                    in{' '}
                                    <span className={cn('font-medium', getCommunityCircleTextColor(post.circle.name))}>
                                        {circleName}
                                    </span>
                                </span>
                                <span className="text-zinc-300 dark:text-zinc-700">&middot;</span>
                                <span>{timeAgo(post.createdAt)}</span>
                            </div>

                            <h3 className="mt-4 max-w-4xl text-[clamp(1.6rem,3vw,2.35rem)] font-semibold leading-[1.12] tracking-[-0.02em] text-zinc-950 transition-colors duration-200 group-hover:text-zinc-700 dark:text-zinc-50 dark:group-hover:text-zinc-200">
                                {title}
                            </h3>

                            {excerpt && (
                                <p className="mt-3 max-w-3xl text-[15px] leading-7 text-zinc-600 line-clamp-4 dark:text-zinc-300">
                                    {excerpt}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </Link>
        );
    }

    if (variant === 'card') {
        return (
            <Link
                href={postHref}
                className={cn(
                    'group relative flex h-full flex-col transition-all duration-200',
                    isFlatSurface
                        ? 'border-b border-zinc-200/70 py-5 dark:border-zinc-800/70'
                        : 'rounded-[24px] border border-zinc-200/80 bg-white/92 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)] hover:-translate-y-0.5 hover:border-zinc-300/80 dark:border-zinc-800 dark:bg-zinc-950/60 dark:shadow-[0_18px_40px_rgba(0,0,0,0.26)]'
                )}
            >
                <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11 shrink-0 border border-zinc-200/70 dark:border-zinc-700/80">
                        <AvatarImage src={post.author.avatarUrl || ''} alt={authorName} />
                        <AvatarFallback className="bg-zinc-100 text-[11px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                            {initials}
                        </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-zinc-500 dark:text-zinc-400">
                            <span className="truncate font-semibold text-zinc-900 dark:text-zinc-100">
                                {authorName}
                            </span>
                            <span className="text-zinc-300 dark:text-zinc-700">&middot;</span>
                            <span className={cn('truncate', getCommunityCircleTextColor(post.circle.name))}>
                                {circleName}
                            </span>
                            <span className="text-zinc-300 dark:text-zinc-700">&middot;</span>
                            <span>{timeAgo(post.createdAt)}</span>
                        </div>
                        <h3 className="mt-2 text-[18px] font-semibold leading-snug tracking-[-0.015em] text-zinc-950 transition-colors duration-200 group-hover:text-zinc-700 dark:text-zinc-50 dark:group-hover:text-zinc-200 line-clamp-3">
                            {title}
                        </h3>
                    </div>
                </div>

                {excerpt && (
                    <p className="mt-4 text-[14px] leading-6 text-zinc-600 line-clamp-3 dark:text-zinc-300">
                        {excerpt}
                    </p>
                )}

                <div className={cn('mt-auto', isFlatSurface ? 'pt-4' : 'pt-5')}>
                    <div className="flex flex-wrap items-center gap-2 text-[12px] font-medium text-zinc-500 dark:text-zinc-400">
                        <span className={cn(
                            'inline-flex items-center gap-1.5',
                            !isFlatSurface && 'rounded-full border border-zinc-200/80 bg-zinc-50/90 px-3 py-1.5 dark:border-zinc-800 dark:bg-zinc-950/55'
                        )}>
                            <ChatCircle size={14} weight="bold" />
                            {replyLabel}
                        </span>
                        {post.isTrending && (
                            <span className={cn(
                                'inline-flex items-center gap-1.5 text-orange-700 dark:text-orange-200',
                                !isFlatSurface && 'rounded-full border border-orange-200/70 bg-orange-50/90 px-3 py-1.5 dark:border-orange-500/30 dark:bg-orange-500/12'
                            )}>
                                <TrendUp size={13} weight="bold" />
                                Trending
                            </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-zinc-500 transition-colors group-hover:text-zinc-900 dark:group-hover:text-zinc-100">
                            Open thread
                            <span aria-hidden="true">→</span>
                        </span>
                    </div>
                </div>
            </Link>
        );
    }

    return (
        <Link
            href={postHref}
            className={cn(
                'group relative flex items-start gap-4 transition-all duration-200',
                isFlatSurface
                    ? 'border-b border-zinc-200/70 py-6 hover:bg-zinc-50/40 dark:border-zinc-800/80 dark:hover:bg-zinc-950/25'
                    : 'rounded-[24px] border border-zinc-200/70 bg-white/88 px-4 py-4 shadow-[0_14px_30px_rgba(15,23,42,0.04)] hover:border-zinc-300/80 hover:bg-white dark:border-zinc-800 dark:bg-zinc-950/45 dark:shadow-none dark:hover:border-zinc-700 dark:hover:bg-zinc-950/60'
            )}
        >
            <div className="mt-0.5 flex shrink-0 flex-col items-center gap-2">
                <Avatar className="h-10 w-10 border border-zinc-200/70 dark:border-zinc-700/80">
                    <AvatarImage src={post.author.avatarUrl || ''} alt={authorName} />
                    <AvatarFallback className="bg-zinc-100 text-[11px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {initials}
                    </AvatarFallback>
                </Avatar>

                {isFlatSurface ? (
                    <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                        {post.commentCount}
                    </span>
                ) : (
                    <span className="inline-flex min-w-[52px] items-center justify-center rounded-2xl border border-zinc-200/80 bg-zinc-50/90 px-2 py-1.5 text-[12px] font-semibold text-zinc-600 shadow-sm shadow-zinc-950/5 dark:border-zinc-800 dark:bg-zinc-950/55 dark:text-zinc-300 dark:shadow-none">
                        {post.commentCount}
                    </span>
                )}
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-zinc-500 dark:text-zinc-400">
                    <span className="truncate font-semibold text-zinc-900 dark:text-zinc-100">
                        {authorName}
                    </span>
                    <span className="text-zinc-300 dark:text-zinc-700">&middot;</span>
                    <span className={cn('truncate', getCommunityCircleTextColor(post.circle.name))}>
                        {circleName}
                    </span>
                    <span className="text-zinc-300 dark:text-zinc-700">&middot;</span>
                    <span>{timeAgo(post.createdAt)}</span>
                </div>

                <h3 className="mt-2 text-[16px] font-semibold leading-snug tracking-[-0.015em] text-zinc-950 transition-colors duration-200 group-hover:text-zinc-700 dark:text-zinc-50 dark:group-hover:text-zinc-200">
                    {title}
                </h3>

                {excerpt && (
                    <p className="mt-2 text-[14px] leading-6 text-zinc-600 line-clamp-2 dark:text-zinc-300">
                        {excerpt}
                    </p>
                )}

                <div className={cn(
                    'mt-3 flex flex-wrap items-center text-[12px] font-medium text-zinc-500 dark:text-zinc-400',
                    isFlatSurface ? 'gap-3' : 'gap-2'
                )}>
                    <span className={cn(
                        'inline-flex items-center gap-1.5',
                        !isFlatSurface && 'rounded-full border border-zinc-200/80 bg-zinc-50/90 px-3 py-1.5 dark:border-zinc-800 dark:bg-zinc-950/55'
                    )}>
                        <ChatCircle size={14} weight="bold" />
                        {replyLabel}
                    </span>
                    {post.isTrending && (
                        <span className={cn(
                            'inline-flex items-center gap-1.5 text-orange-700 dark:text-orange-200',
                            !isFlatSurface && 'rounded-full border border-orange-200/70 bg-orange-50/90 px-3 py-1.5 dark:border-orange-500/30 dark:bg-orange-500/12'
                        )}>
                            <TrendUp size={13} weight="bold" />
                            Trending
                        </span>
                    )}
                    <span className="text-zinc-400 transition-colors group-hover:text-zinc-600 dark:text-zinc-500 dark:group-hover:text-zinc-300">
                        Open thread
                    </span>
                </div>
            </div>

            {post.isTrending && !isFlatSurface && (
                <span
                    className={cn(
                        'absolute right-4 top-4 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]',
                        'bg-orange-50 text-orange-700 ring-1 ring-orange-200/70 dark:bg-orange-500/12 dark:text-orange-200 dark:ring-orange-500/30'
                    )}
                >
                    <TrendUp size={11} weight="bold" />
                    Hot
                </span>
            )}
        </Link>
    );
}
