'use client';

import { User } from '@phosphor-icons/react';
import { getBrowserSafeImageSrc } from '@/utils/imageUrl';

export function getDisplayName(name: string | null | undefined) {
    if (!name) return 'Anonymous';
    const trimmed = name.trim();
    return trimmed || 'Anonymous';
}

export default function Avatar({
    name,
    avatarUrl,
    size = 'sm'
}: {
    name: string | null | undefined;
    avatarUrl: string | null | undefined;
    size?: 'sm' | 'md';
}) {
    const sizeClasses = size === 'md' ? 'h-8 w-8 text-[11px]' : 'h-6 w-6 text-[10px]';
    const initial = getDisplayName(name).charAt(0).toUpperCase();
    const resolvedAvatarUrl = getBrowserSafeImageSrc(avatarUrl, {
        width: size === 'md' ? 96 : 64,
    });

    if (resolvedAvatarUrl) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={resolvedAvatarUrl}
                alt={getDisplayName(name)}
                className={`${sizeClasses} rounded-full object-cover border border-zinc-200 dark:border-zinc-700/80`}
                referrerPolicy="no-referrer"
            />
        );
    }

    return (
        <div
            className={`${sizeClasses} rounded-full border border-zinc-200 dark:border-zinc-700/80 bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 font-semibold flex items-center justify-center`}
        >
            {initial || <User weight="fill" size={12} />}
        </div>
    );
}
