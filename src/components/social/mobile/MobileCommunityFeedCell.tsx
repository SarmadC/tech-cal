'use client';

import Link from 'next/link';
import { ChatCircle } from '@phosphor-icons/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { CommunityFeedPost } from '@/types/community';
import { buildCirclePostPath, parseCirclePostContent } from '@/utils/circlePosts';
import {
  formatCommunityCircleName,
  formatCommunityRelativeTime,
  getCommunityCircleTextColor,
} from '@/components/social/community-hub-shared';
import { cn } from '@/lib/utils';

interface MobileCommunityFeedCellProps {
  post: CommunityFeedPost;
  variant?: 'lead' | 'list';
}

export default function MobileCommunityFeedCell({
  post,
  variant = 'list',
}: MobileCommunityFeedCellProps) {
  const initials = (post.author.fullName || 'U').slice(0, 2).toUpperCase();
  const parsedContent = parseCirclePostContent(post.content ?? '');
  const title = post.title || parsedContent.title || parsedContent.body;
  const excerpt = post.title ? post.content : parsedContent.excerpt;
  const postHref = buildCirclePostPath(post.circle.slug, post.id, post.content);
  const relativeTime = formatCommunityRelativeTime(post.createdAt);
  const circleName = formatCommunityCircleName(post.circle.name);
  const isLead = variant === 'lead';

  return (
    <Link href={postHref} className="block px-4 py-4 transition-colors hover:bg-[var(--background-main)]/30">
      <div className="flex items-start gap-3">
        <Avatar className="mt-0.5 h-10 w-10 shrink-0 border border-[var(--border-default)]/30">
          <AvatarImage
            src={post.author.avatarUrl || ''}
            alt={post.author.fullName || 'User'}
          />
          <AvatarFallback className="bg-[var(--background-main)] text-[10px] font-semibold text-[var(--foreground-secondary)]">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-[var(--foreground-tertiary)]">
            <span className="text-[var(--foreground-primary)]">
              {post.author.fullName || 'Anonymous'}
            </span>
            <span>•</span>
            <span className={getCommunityCircleTextColor(post.circle.name)}>{circleName}</span>
            <span>•</span>
            <span>{relativeTime}</span>
            {post.isTrending ? (
              <>
                <span>•</span>
                <span>Trending</span>
              </>
            ) : null}
          </div>

          <h3
            className={cn(
              'mt-1.5 font-semibold tracking-[-0.02em] text-[var(--foreground-primary)]',
              isLead ? 'line-clamp-3 text-[16px] leading-[1.35]' : 'line-clamp-2 text-[15px] leading-[1.38]'
            )}
          >
            {title}
          </h3>

          {excerpt ? (
            <p
              className={cn(
                'mt-1.5 text-[13px] leading-5 text-[var(--foreground-secondary)]',
                isLead ? 'line-clamp-3' : 'line-clamp-2'
              )}
            >
              {excerpt}
            </p>
          ) : null}

          {post.commentCount > 0 ? (
            <div className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--foreground-tertiary)]">
              <ChatCircle size={12} weight="bold" />
              <span>{post.commentCount} replies</span>
            </div>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
