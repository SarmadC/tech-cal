'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import React, { useEffect } from 'react';

const IS_PRODUCTION = typeof window !== 'undefined'
    && window.location.hostname !== 'localhost'
    && !window.location.hostname.startsWith('127.')
    && !window.location.hostname.startsWith('192.168.');

export function PostHogProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_POSTHOG_KEY) return;

        // Skip PostHog entirely in development to prevent polluting production analytics
        if (!IS_PRODUCTION) return;

        const init = () => posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
            api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
            person_profiles: 'identified_only',
            capture_pageview: false,
            capture_exceptions: true,
            disable_session_recording: false,
        });

        if ('requestIdleCallback' in window) {
            const id = requestIdleCallback(init, { timeout: 3000 });
            return () => cancelIdleCallback(id);
        } else {
            const t = setTimeout(init, 1500);
            return () => clearTimeout(t);
        }
    }, []);

    return <PHProvider client={posthog}>{children}</PHProvider>;
}
