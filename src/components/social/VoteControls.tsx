'use client';

import { CaretUp, CaretDown } from '@phosphor-icons/react';

export interface VoteControlsProps {
    score: number;
    vote: number;
    onVote: (vote: 1 | -1) => void;
}

export default function VoteControls({ score, vote, onVote }: VoteControlsProps) {
    return (
        <div className="inline-flex items-center gap-1.5 leading-none text-zinc-500 dark:text-zinc-400">
            <button
                type="button"
                onClick={() => onVote(1)}
                className={`inline-flex h-5 w-5 items-center justify-center rounded transition-colors ${vote === 1 ? 'text-zinc-900 dark:text-zinc-100' : 'hover:text-zinc-900 dark:hover:text-zinc-100'}`}
                aria-label="Upvote"
            >
                <CaretUp weight={vote === 1 ? 'bold' : 'regular'} size={14} />
            </button>

            <span
                className={`min-w-[14px] text-center text-[13px] font-semibold leading-none ${vote === 1 ? 'text-zinc-900 dark:text-zinc-100' : vote === -1 ? 'text-zinc-700 dark:text-zinc-300' : ''}`}
            >
                {score}
            </span>

            <button
                type="button"
                onClick={() => onVote(-1)}
                className={`inline-flex h-5 w-5 items-center justify-center rounded transition-colors ${vote === -1 ? 'text-zinc-900 dark:text-zinc-100' : 'hover:text-zinc-900 dark:hover:text-zinc-100'}`}
                aria-label="Downvote"
            >
                <CaretDown weight={vote === -1 ? 'bold' : 'regular'} size={14} />
            </button>
        </div>
    );
}
