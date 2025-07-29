// src/app/auth/callback/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, initialized, loading } = useAuth();
  
  // Local state for UI feedback, separate from the AuthContext's state
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    // This effect runs whenever the auth state from our context changes.
    // We wait until the AuthProvider is initialized and no longer loading.
    if (initialized && !loading) {
      if (user) {
        // SUCCESS: The AuthContext has a user!
        setStatus('success');
        setMessage('Authentication successful! Redirecting...');
        
        const redirectTo = searchParams.get('redirect_to') || '/dashboard';
        setTimeout(() => {
          router.push(redirectTo);
        }, 1500); // A short delay to show the success message
      } else {
        // ERROR: The AuthContext finished loading but there's no user.
        // This means the OAuth flow failed.
        setStatus('error');
        setMessage('Authentication failed. Please try signing in again.');
        
        setTimeout(() => {
          router.push('/login?error=auth_callback_failed');
        }, 3000); // A longer delay to let the user read the error
      }
    }
  }, [user, initialized, loading, router, searchParams]);

  // A failsafe timeout. If the auth context doesn't resolve after ~10 seconds,
  // something is wrong. Redirect the user back to login.
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (status === 'loading') {
        setStatus('error');
        setMessage('Authentication timed out. Please try again.');
        router.push('/login?error=auth_timeout');
      }
    }, 10000); // 10-second timeout

    return () => clearTimeout(timeoutId);
  }, [status, router]);

  // The JSX for rendering the status remains the same as your original code,
  // as it's already very good!
  return (
    <div className="min-h-screen bg-background-main flex items-center justify-center">
      <div className="max-w-md w-full text-center p-8">
        {/* Status Icon */}
        <div className="mb-6">
          {status === 'loading' && (
            <div className="w-16 h-16 bg-accent-primary/10 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <svg className="w-8 h-8 text-accent-primary animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          )}
          
          {status === 'success' && (
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          
          {status === 'error' && (
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
        </div>

        {/* Status Message */}
        <h1 className="text-2xl font-bold text-foreground-primary mb-4">
          {status === 'loading' && 'Authenticating...'}
          {status === 'success' && 'Success!'}
          {status === 'error' && 'Authentication Failed'}
        </h1>
        
        <p className="text-foreground-secondary mb-6">
          {message}
        </p>

        {/* Progress Indicator */}
        {status === 'loading' && (
          <div className="w-full bg-background-secondary rounded-full h-2">
            <div className="bg-accent-primary h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
        )}

        {/* Manual Action Buttons */}
        {status === 'error' && (
          <div className="space-y-3">
            <button
              onClick={() => router.push('/login')}
              className="w-full bg-accent-primary hover:bg-accent-primary-hover text-white font-medium py-3 px-4 rounded-lg transition-all"
            >
              Back to Sign In
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full bg-background-secondary hover:bg-background-tertiary text-foreground-primary font-medium py-3 px-4 rounded-lg transition-all border border-border-color"
            >
              Go Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}