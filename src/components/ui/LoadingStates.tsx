// src/components/ui/LoadingStates.tsx
import React from 'react';

import { BrandLoadingLogo } from '@/components/brand/BrandLoadingLogo';

/**
 * Reusable loading skeleton for events/calendar content
 */
export function EventsLoadingSkeleton() {
    return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center text-foreground-secondary">
                <BrandLoadingLogo className="mx-auto mb-4 text-foreground-primary" />
                <p>Loading events...</p>
            </div>
        </div>
    );
}

/**
 * Reusable loading skeleton for general content
 */
export function ContentLoadingSkeleton({ message = "Loading..." }: { message?: string }) {
    return (
        <div className="flex items-center justify-center min-h-[200px]">
            <div className="text-center text-foreground-secondary">
                <BrandLoadingLogo className="mx-auto mb-4 h-10 w-10 text-foreground-primary" size={40} />
                <p>{message}</p>
            </div>
        </div>
    );
}
