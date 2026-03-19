'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MobileHeaderProps {
    eyebrow?: string;
    title?: string;
    subtitle?: string;
    meta?: ReactNode;
    actions?: ReactNode;
    children?: ReactNode;
    isCompact?: boolean;
    className?: string;
    'data-testid'?: string;
}

export default function MobileHeader({
    eyebrow,
    title,
    subtitle,
    meta,
    actions,
    children,
    isCompact = false,
    className,
    'data-testid': dataTestId,
}: MobileHeaderProps) {
    const hasTopContent = Boolean(eyebrow || title || subtitle || actions);

    return (
        <header
            className={cn('mobile-header', className)}
            data-compact={isCompact}
            data-testid={dataTestId}
        >
            {hasTopContent ? (
                <div className="mobile-header__top">
                    <div className="mobile-header__copy">
                        {eyebrow ? <p className="mobile-header__eyebrow">{eyebrow}</p> : null}
                        {title ? <h1 className="mobile-header__title">{title}</h1> : null}
                        {subtitle ? <p className="mobile-header__subtitle">{subtitle}</p> : null}
                    </div>
                    {actions ? <div className="mobile-header__actions">{actions}</div> : null}
                </div>
            ) : null}
            {meta ? <div className="mobile-header__meta">{meta}</div> : null}
            {children ? <div className="mobile-header__body">{children}</div> : null}
        </header>
    );
}
