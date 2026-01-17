'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function RouteTracker() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const lastPathRef = useRef<string | null>(null);

    useEffect(() => {
        const search = searchParams.toString();
        const currentPath = `${pathname}${search ? `?${search}` : ''}`;
        const previousPath = lastPathRef.current;

        if (previousPath && previousPath !== currentPath) {
            sessionStorage.setItem('lastPath', previousPath);
            if (!previousPath.startsWith('/dashboard/settings')) {
                sessionStorage.setItem('lastNonSettingsPath', previousPath);
            }
        }

        lastPathRef.current = currentPath;
    }, [pathname, searchParams]);

    return null;
}
