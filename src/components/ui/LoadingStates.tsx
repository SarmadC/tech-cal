// src/components/ui/LoadingStates.tsx
import React from 'react';

/**
 * Reusable loading skeleton for events/calendar content
 */
export function EventsLoadingSkeleton() {
    return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading events...</p>
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
            <div className="text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">{message}</p>
            </div>
        </div>
    );
}
