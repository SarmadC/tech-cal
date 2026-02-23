'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PencilSimple, Plus, Check, SignOut } from '@phosphor-icons/react';
import { formatCompactCount } from '@/utils/numberFormatting';
import { MaterialIcon, type IconName } from '@/components/ui/Icon';
import Breadcrumbs from '@/components/common/Breadcrumbs';

interface CircleHeroProps {
    id: string;
    name: string;
    description: string;
    memberCount: number;
    isJoined: boolean;
    icon?: string;
    onJoinToggle: (circleId: string, join: boolean) => Promise<boolean>;
    postComposerRef?: React.RefObject<HTMLTextAreaElement | null>;
}

export default function CircleHero({
    id,
    name,
    description,
    memberCount,
    isJoined: initialIsJoined,
    icon,
    onJoinToggle,
    postComposerRef,
}: CircleHeroProps) {
    const [isJoined, setIsJoined] = useState(initialIsJoined);
    const [isLoading, setIsLoading] = useState(false);
    const isInFlightRef = useRef(false);
    const router = useRouter();

    const handleToggle = async () => {
        // Guard against concurrent requests from rapid clicks
        if (isInFlightRef.current) return;
        isInFlightRef.current = true;
        setIsLoading(true);
        try {
            const success = await onJoinToggle(id, !isJoined);
            if (success) {
                setIsJoined(!isJoined);
                router.refresh();
            }
        } finally {
            setIsLoading(false);
            isInFlightRef.current = false;
        }
    };

    return (
        <div className="bg-white dark:bg-[#08090a] border-b border-zinc-200 dark:border-zinc-800">
            {/* Breadcrumb bar */}
            <div className="max-w-[960px] mx-auto px-6 lg:px-8 pt-3 pb-0">
                <Breadcrumbs
                    trail={[
                        { label: 'Community', href: '/community' },
                        { label: name },
                    ]}
                />
            </div>
            <div className="max-w-[960px] mx-auto px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">

                    <div className="min-w-0">
                        <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            {name}
                            <span className="text-xs font-normal text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                {formatCompactCount(memberCount)} members
                            </span>
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                    {isJoined && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs font-medium gap-1.5 px-3 border-zinc-200 dark:border-zinc-800 shadow-sm"
                        >
                            <Plus size={14} /> Invite
                        </Button>
                    )}

                    <Button
                        onClick={handleToggle}
                        disabled={isLoading}
                        variant={isJoined ? "outline" : "default"}
                        size="sm"
                        className={`group h-8 text-xs font-medium transition-all px-3 ${isJoined
                            ? 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-red-400 hover:text-red-500 dark:hover:border-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10'
                            : 'bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 shadow-sm'
                            }`}
                    >
                        {isLoading ? '...' : isJoined ? (
                            <>
                                <span className="flex items-center gap-1.5 group-hover:hidden">
                                    <Check size={14} /> Joined
                                </span>
                                <span className="hidden items-center gap-1.5 group-hover:flex">
                                    <SignOut size={14} /> Leave
                                </span>
                            </>
                        ) : 'Join Circle'}
                    </Button>

                </div>
            </div>
        </div>
    );
}
