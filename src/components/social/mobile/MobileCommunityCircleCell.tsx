'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MaterialIcon } from '@/components/ui/Icon';
import type { CommunityLaunchpadCircle } from '@/types/community';
import { BrandLoadingLogo } from '@/components/brand/BrandLoadingLogo';
import {
  formatCommunityCircleName,
  getCommunityCircleColor,
  getCommunityCircleIcon,
} from '@/components/social/community-hub-shared';

interface MobileCommunityCircleCellProps {
  circle: CommunityLaunchpadCircle;
  variant: 'joined' | 'discover';
  onToggle?: (circleId: string, isJoined: boolean) => Promise<void>;
}

export default function MobileCommunityCircleCell({
  circle,
  variant,
  onToggle,
}: MobileCommunityCircleCellProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [optimisticJoined, setOptimisticJoined] = useState(circle.isJoined);
  const isDiscover = variant === 'discover';
  const circleName = formatCommunityCircleName(circle.name);

  const handleToggle = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!onToggle || isLoading) {
      return;
    }

    const previousState = optimisticJoined;
    setIsLoading(true);
    setOptimisticJoined(!previousState);

    try {
      await onToggle(circle.id, previousState);
    } catch {
      setOptimisticJoined(previousState);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isDiscover) {
    return (
      <Link
        href={circle.href}
        className="block px-4 py-3.5 transition-colors hover:bg-[var(--background-main)]/30"
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${getCommunityCircleColor(circle.name)}`}
          >
            <MaterialIcon
              name={getCommunityCircleIcon(circle.name, circle.icon)}
              size={18}
              className="text-white"
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-[var(--foreground-primary)]">
              {circleName}
            </p>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <article className="px-4 py-3.5">
      <div className="flex items-center gap-3">
        <Link
          href={circle.href}
          className="flex min-w-0 flex-1 items-center gap-3 transition-colors hover:text-[var(--foreground-primary)]"
        >
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${getCommunityCircleColor(circle.name)}`}
          >
            <MaterialIcon
              name={getCommunityCircleIcon(circle.name, circle.icon)}
              size={18}
              className="text-white"
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-[var(--foreground-primary)]">
              {circleName}
            </p>
            {circle.description ? (
              <p className="mt-1 line-clamp-1 text-[12px] leading-5 text-[var(--foreground-secondary)]">
                {circle.description}
              </p>
            ) : null}
          </div>
        </Link>

        <Button
          type="button"
          size="sm"
          variant={optimisticJoined ? 'outline' : 'secondary'}
          onClick={handleToggle}
          disabled={isLoading}
          className="h-7 shrink-0 rounded-full px-3 text-[10px] font-semibold"
        >
          {isLoading ? (
            <BrandLoadingLogo className="h-3 w-3 text-current" inline label={null} size={12} />
          ) : optimisticJoined ? (
            'Joined'
          ) : (
            'Join'
          )}
        </Button>
      </div>
    </article>
  );
}
