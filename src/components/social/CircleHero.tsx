'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Check, SignOut } from '@phosphor-icons/react';
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
    description: _description,
    memberCount: _memberCount,
    isJoined: initialIsJoined,
    icon: _icon,
    onJoinToggle,
    postComposerRef: _postComposerRef,
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
            <div className="mx-auto hidden max-w-[1180px] px-6 pb-0 pt-3 lg:px-8 md:block">
                <Breadcrumbs
                    trail={[
                        { label: 'Community', href: '/community' },
                        { label: name },
                    ]}
                />
            </div>
            <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-3 px-6 py-4 lg:px-8">
                <div className="min-w-0 flex-1">
                    <h1 className="truncate text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                        {name}
                    </h1>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    <Button
                        onClick={handleToggle}
                        disabled={isLoading}
                        aria-label={isJoined ? 'Leave circle' : 'Join circle'}
                        variant="ghost"
                        size="sm"
                        className={`group h-8 text-xs font-medium transition-all px-3 ${isJoined
                            ? '!border-0 !bg-transparent !shadow-none text-[var(--foreground-secondary)] hover:!bg-transparent hover:text-red-500 dark:hover:text-red-400'
                            : '!border-0 !bg-transparent !shadow-none text-[var(--foreground-primary)] hover:!bg-transparent hover:text-[var(--foreground-secondary)]'
                            }`}
                    >
                        {isLoading ? '...' : isJoined ? (
                            <>
                                <span className="flex items-center gap-1.5 md:hidden">
                                    <SignOut size={14} /> Leave
                                </span>
                                <span className="hidden items-center gap-1.5 md:flex md:group-hover:hidden">
                                    <Check size={14} /> Joined
                                </span>
                                <span className="hidden items-center gap-1.5 md:group-hover:flex">
                                    <SignOut size={14} /> Leave
                                </span>
                            </>
                        ) : (
                            <>
                                <span className="md:hidden">Join</span>
                                <span className="hidden md:inline">Join Circle</span>
                            </>
                        )}
                    </Button>

                </div>
            </div>
        </div>
    );
}
