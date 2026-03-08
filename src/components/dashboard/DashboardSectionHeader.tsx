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
    presentation?: 'default' | 'mobile-dashboard';
}

export function DashboardSectionHeader({
    title,
    subtitle,
    className,
    action,
    icon: IconComponent,
    presentation = 'default',
}: DashboardSectionHeaderProps) {
    const isMobileDashboard = presentation === 'mobile-dashboard';

    return (
        <div className={cn(isMobileDashboard ? "mobile-dashboard-sectionHeader" : "flex items-start justify-between mb-4", className)}>
            <div className={cn(isMobileDashboard ? "mobile-dashboard-sectionHeading" : "flex flex-col gap-1")}>
                <div className={cn(isMobileDashboard ? "mobile-dashboard-sectionTitleRow" : "flex items-center gap-2")}>
                    {IconComponent && (
                        <IconComponent
                            className={cn(
                                "w-5 h-5 text-zinc-400 dark:text-zinc-500",
                                isMobileDashboard && "mobile-dashboard-sectionIcon"
                            )}
                            weight="regular"
                        />
                    )}
                    <h2 className={cn("text-lg font-medium text-zinc-900 dark:text-white leading-none", isMobileDashboard && "mobile-dashboard-sectionTitle")}>{title}</h2>
                </div>
                {subtitle && (
                    <p className={cn("text-xs text-zinc-500 dark:text-zinc-500 mt-0.5", isMobileDashboard && "mobile-dashboard-sectionSubtitle")}>
                        {subtitle}
                    </p>
                )}
            </div>
            {action && (
                <div className={cn("flex-shrink-0", isMobileDashboard && "mobile-dashboard-sectionAction")}>
                    {action}
                </div>
            )}
        </div>
    );
}
