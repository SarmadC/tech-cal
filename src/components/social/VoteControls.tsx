'use client';

import { CaretUp, CaretDown } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

export interface VoteControlsProps {
    score: number;
    vote: number;
    onVote: (vote: 1 | -1) => void;
    layout?: 'horizontal' | 'vertical';
    density?: 'sm' | 'md';
    className?: string;
}

export default function VoteControls({
    score,
    vote,
    onVote,
    layout = 'horizontal',
    density = 'md',
    className,
}: VoteControlsProps) {
    const isVertical = layout === 'vertical';
    const buttonSize = density === 'sm'
        ? 'h-7 w-7'
        : isVertical
            ? 'h-8 w-8'
            : 'h-8 w-8';

    return (
        <div
            className={cn(
                'text-zinc-500 dark:text-zinc-400',
                isVertical
                    ? 'inline-flex min-w-[36px] shrink-0 flex-col items-center gap-0 py-0.5'
                    : 'inline-flex items-center gap-1.5',
                className
            )}
            aria-label="Vote controls"
            data-layout={layout}
        >
            <button
                type="button"
                onClick={() => onVote(1)}
                className={cn(
                    'inline-flex items-center justify-center rounded-xl transition-colors',
                    buttonSize,
                    vote === 1
                        ? 'bg-orange-100/80 text-orange-700 dark:bg-orange-500/18 dark:text-orange-200'
                        : 'hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-900/80 dark:hover:text-zinc-100'
                )}
                aria-label="Upvote"
                aria-pressed={vote === 1}
            >
                <CaretUp weight={vote === 1 ? 'bold' : 'regular'} size={density === 'sm' ? 14 : 16} />
            </button>

            <span
                className={cn(
                    'text-center font-semibold leading-none tabular-nums',
                    isVertical ? 'min-w-[32px] text-[13px]' : 'min-w-[24px] text-[12px] sm:text-[13px]',
                    vote === 1 && 'text-orange-700 dark:text-orange-200',
                    vote === -1 && 'text-sky-700 dark:text-sky-200',
                    vote === 0 && 'text-zinc-700 dark:text-zinc-300'
                )}
            >
                {score}
            </span>

            <button
                type="button"
                onClick={() => onVote(-1)}
                className={cn(
                    'inline-flex items-center justify-center rounded-xl transition-colors',
                    buttonSize,
                    vote === -1
                        ? 'bg-sky-100/80 text-sky-700 dark:bg-sky-500/18 dark:text-sky-200'
                        : 'hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-900/80 dark:hover:text-zinc-100'
                )}
                aria-label="Downvote"
                aria-pressed={vote === -1}
            >
                <CaretDown weight={vote === -1 ? 'bold' : 'regular'} size={density === 'sm' ? 14 : 16} />
            </button>
        </div>
    );
}
