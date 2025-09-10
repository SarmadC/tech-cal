'use client';

import { PropsWithChildren } from 'react';
import { IconContext } from '@phosphor-icons/react';

export default function IconProvider({ children }: PropsWithChildren) {
    return (
        <IconContext.Provider value={{ color: 'currentColor', size: 16, weight: 'regular' }}>
            {children}
        </IconContext.Provider>
    );
}


