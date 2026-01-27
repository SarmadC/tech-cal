'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import React, { useEffect } from 'react';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        if (
            typeof window !== 'undefined' &&
            process.env.NEXT_PUBLIC_POSTHOG_KEY
        ) {
            posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
                api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
                person_profiles: 'identified_only',
                // Disable automatic pageview capture if we want manual control, 
                // but usually true is fine for SPA transition handling in Next.js
                capture_pageview: false
            });
        }
    }, []);

    return <PHProvider client={posthog}>{children}</PHProvider>;
}
