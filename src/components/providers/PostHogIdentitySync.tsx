'use client';

import { useEffect, useRef } from 'react';
import { usePostHog } from 'posthog-js/react';
import { useAuth } from '@/contexts';

export function PostHogIdentitySync() {
    const posthog = usePostHog();
    const { user, profile, initialized } = useAuth();
    const previousUserIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (!initialized || !posthog) return;

        if (user) {
            // Only call identify if user changed (avoids re-identifying on every render)
            if (previousUserIdRef.current !== user.id) {
                posthog.identify(user.id, {
                    email: user.email,
                    name: profile?.fullName ?? user.user_metadata?.full_name,
                });

                // Fire client-side user_signed_up for accounts created in the last 5 minutes.
                // This links the browser session to the server-side event so the signup funnel works.
                if (previousUserIdRef.current === null && user.created_at) {
                    const ageMs = Date.now() - new Date(user.created_at).getTime();
                    if (ageMs < 10 * 60 * 1000) {
                        posthog.capture('user_signed_up', {
                            email: user.email,
                            method: user.app_metadata?.provider ?? 'unknown',
                            source: 'client_identity_sync',
                        });
                    }
                }

                previousUserIdRef.current = user.id;
            }
        } else {
            // User logged out — reset to fresh anonymous session
            if (previousUserIdRef.current !== null) {
                posthog.reset();
                previousUserIdRef.current = null;
            }
        }
    }, [user, profile, initialized, posthog]);

    return null;
}
