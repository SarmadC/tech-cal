'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MobileSectionHeaderProps {
    eyebrow?: string;
    title: string;
    subtitle?: string;
    action?: ReactNode;
    className?: string;
}

export default function MobileSectionHeader({
    eyebrow,
    title,
    subtitle,
    action,
    className,
}: MobileSectionHeaderProps) {
    return (
        <div className={cn('mobile-section-header', className)}>
            <div className="mobile-section-header__copy">
                {eyebrow ? <p className="mobile-section-header__eyebrow">{eyebrow}</p> : null}
                <h2 className="mobile-section-header__title">{title}</h2>
                {subtitle ? <p className="mobile-section-header__subtitle">{subtitle}</p> : null}
            </div>
            {action}
        </div>
    );
}
