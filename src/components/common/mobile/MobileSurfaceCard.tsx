'use client';

import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MobileSurfaceCardProps extends ComponentPropsWithoutRef<'div'> {
    as?: ElementType;
    children: ReactNode;
    strong?: boolean;
    interactive?: boolean;
}

export default function MobileSurfaceCard({
    as: Component = 'div',
    children,
    className,
    strong = false,
    interactive = false,
    ...props
}: MobileSurfaceCardProps) {
    return (
        <Component
            className={cn(
                'mobile-surface-card',
                strong && 'mobile-surface-card--strong',
                interactive && 'mobile-surface-card--interactive',
                className
            )}
            {...props}
        >
            {children}
        </Component>
    );
}
