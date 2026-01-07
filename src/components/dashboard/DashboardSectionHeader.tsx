'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface DashboardSectionHeaderProps {
    title: string;
    subtitle?: string;
    className?: string;
    action?: React.ReactNode;
}

export function DashboardSectionHeader({
    title,
    subtitle,
    className,
    action
}: DashboardSectionHeaderProps) {
    return (
        <div className={cn("flex items-end justify-between mb-4", className)}>
            <div className="flex flex-col gap-1">
                <h2 className="text-xs font-semibold text-zinc-500 tracking-wide uppercase">{title}</h2>
                {subtitle && <p className="text-lg font-medium text-zinc-900 dark:text-white leading-none">{subtitle}</p>}
            </div>
            {action && (
                <div className="mb-0.5">
                    {action}
                </div>
            )}
        </div>
    );
}
