/**
 * Calendar OAuth Callback Page
 * 
 * CRITICAL: This page is called immediately after Google OAuth redirect
 * It extracts tokens from the session and stores them in the database
 * 
 * Must run before tokens expire or are rotated
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getErrorMessage } from '@/utils/errorHandling';
import { BrandLoadingLogo } from '@/components/brand/BrandLoadingLogo';

export default function ConnectCalendarPage() {
    const router = useRouter();
    const [status, setStatus] = useState<'connecting' | 'success' | 'error'>('connecting');
    const [message, setMessage] = useState('Connecting your calendar...');

    useEffect(() => {
        const connectCalendar = async () => {
            try {
                // Call the connect API immediately to extract tokens
                const response = await fetch('/api/calendar/google/connect', {
                    method: 'POST'
                });

                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.error || 'Failed to connect calendar');
                }

                setStatus('success');
                setMessage(data.message);

                // Redirect back to settings after 2 seconds
                setTimeout(() => {
                    router.push('/dashboard/settings?tab=integrations');
                }, 2000);

            } catch (error: unknown) {
                console.error('Error connecting calendar:', error);
                setStatus('error');
                setMessage(getErrorMessage(error) || 'Failed to connect calendar');

                // Redirect back to settings after 3 seconds
                setTimeout(() => {
                    router.push('/dashboard/settings?tab=integrations');
                }, 3000);
            }
        };

        connectCalendar();
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div 
                className="max-w-md w-full p-8 rounded-lg text-center"
                style={{ 
                    backgroundColor: 'var(--background-main)',
                    border: '1px solid var(--border-default)'
                }}
            >
                {status === 'connecting' && (
                    <div className="space-y-4">
                        <BrandLoadingLogo className="mx-auto text-foreground-primary" size={48} />
                        <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground-primary)' }}>
                            {message}
                        </h2>
                        <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                            Please wait a moment...
                        </p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="space-y-4">
                        <div 
                            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
                            style={{ backgroundColor: 'var(--success-light)' }}
                        >
                            <svg className="w-6 h-6" style={{ color: 'var(--success)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground-primary)' }}>
                            {message}
                        </h2>
                        <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                            Redirecting you back to settings...
                        </p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="space-y-4">
                        <div 
                            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
                            style={{ backgroundColor: 'var(--error-light)' }}
                        >
                            <svg className="w-6 h-6" style={{ color: 'var(--error)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground-primary)' }}>
                            Connection Failed
                        </h2>
                        <p className="text-sm" style={{ color: 'var(--error)' }}>
                            {message}
                        </p>
                        <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                            Redirecting you back to settings...
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
