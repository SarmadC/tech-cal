'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { Icon } from '@phosphor-icons/react';

interface DashboardSectionHeaderProps {
    title: string;
    subtitle?: string;
    className?: string;
    action?: React.ReactNode;
    icon?: Icon;
}

export function DashboardSectionHeader({
    title,
    subtitle,
    className,
    action,
    icon: IconComponent
}: DashboardSectionHeaderProps) {
    return (
        <div className={cn("flex items-start justify-between mb-4", className)}>
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    {IconComponent && (
                        <IconComponent
                            className="w-5 h-5 text-zinc-400 dark:text-zinc-500"
                            weight="regular"
                        />
                    )}
                    <h2 className="text-lg font-medium text-zinc-900 dark:text-white leading-none">{title}</h2>
                </div>
                {subtitle && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-0.5">
                        {subtitle}
                    </p>
                )}
            </div>
            {action && (
                <div className="flex-shrink-0">
                    {action}
                </div>
            )}
        </div>
    );
}
