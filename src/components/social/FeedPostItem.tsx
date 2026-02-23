'use client';

import Link from 'next/link';
import { ChatCircle, TrendUp } from '@phosphor-icons/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { CommunityFeedPost } from '@/types/community';

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
}

export default function FeedPostItem({ post }: FeedPostItemProps) {
    const initials = (post.author.fullName || 'U').slice(0, 2).toUpperCase();

    return (
        <Link
            href={`/circle/${post.circle.slug}?post=${post.id}`}
            className="group relative flex items-start gap-4 px-6 py-5 border-b border-[var(--border-default)]/10 transition-all duration-200 hover:bg-[var(--background-secondary)]/30"
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
                    {(post.content ?? '').split('\n')[0]}
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
                <span className="absolute right-6 top-5 inline-flex items-center gap-1 rounded-full bg-zinc-100 dark:bg-zinc-800/50 px-3 py-1 text-[10px] font-bold text-[var(--foreground-secondary)] border border-[var(--border-default)]/10">
                    <TrendUp size={12} weight="bold" />
                    Trending
                </span>
            )}
        </Link>
    );
}
