'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MobileAppShellProps {
    header?: ReactNode;
    children: ReactNode;
    className?: string;
    viewportClassName?: string;
    headerClassName?: string;
    contentClassName?: string;
}

export default function MobileAppShell({
    header,
    children,
    className,
    viewportClassName,
    headerClassName,
    contentClassName,
}: MobileAppShellProps) {
    return (
        <div className={cn('mobile-app-shell', className)}>
            <div className={cn('mobile-app-shell__viewport', viewportClassName)}>
                {header ? (
                    <div className={cn('mobile-app-shell__header', headerClassName)}>
                        {header}
                    </div>
                ) : null}
                <div className={cn('mobile-app-shell__content', contentClassName)}>
                    {children}
                </div>
            </div>
        </div>
    );
}
