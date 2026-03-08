'use client';

import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MobileDashboardCardProps extends ComponentPropsWithoutRef<'article'> {
    as?: ElementType;
    children: ReactNode;
    className?: string;
    interactive?: boolean;
}

export function MobileDashboardCard({
    as: Component = 'article',
    children,
    className,
    interactive = false,
    ...props
}: MobileDashboardCardProps) {
    return (
        <Component
            className={cn(
                'mobile-dashboard-card',
                interactive && 'mobile-dashboard-cardInteractive',
                className
            )}
            data-mobile-dashboard-card="true"
            {...props}
        >
            {children}
        </Component>
    );
}
