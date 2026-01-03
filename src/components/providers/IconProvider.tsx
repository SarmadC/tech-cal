'use client';

import { PropsWithChildren, useMemo } from 'react';
import { IconContext } from '@phosphor-icons/react';

export default function IconProvider({ children }: PropsWithChildren) {
    // Memoize static value to prevent unnecessary re-renders
    const iconContextValue = useMemo(() => ({
        color: 'currentColor',
        size: 16,
        weight: 'regular' as const
    }), []);

    return (
        <IconContext.Provider value={iconContextValue}>
            {children}
        </IconContext.Provider>
    );
}


