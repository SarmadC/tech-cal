// src/app/auth/reset-password/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();

  // Check if we have valid reset tokens
  useEffect(() => {
    const checkTokens = async () => {
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');

      if (!accessToken || !refreshToken) {
        setIsValidToken(false);
        setError('Invalid or missing reset tokens. Please request a new password reset.');
        return;
      }

      try {
        // Set the session with the tokens from the URL
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          console.error('Error setting session:', error);
          setIsValidToken(false);
          setError('Invalid or expired reset link. Please request a new password reset.');
        } else if (data.session) {
          setIsValidToken(true);
        } else {
          setIsValidToken(false);
          setError('Unable to verify reset link. Please try again.');
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setIsValidToken(false);
        setError('An unexpected error occurred. Please try again.');
      }
    };

    checkTokens();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    // Validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      setIsSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsSubmitting(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        setError(error.message);
      } else {
        setIsSuccess(true);
        // Auto-redirect after 3 seconds
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
      }
    } catch (err) {
      console.error('Error updating password:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading while checking token validity
  if (isValidToken === null) {
    return (
      <div className="min-h-screen bg-background-main flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-primary mx-auto mb-4"></div>
          <p className="text-foreground-secondary">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  // Show error if token is invalid
  if (!isValidToken) {
    return (
      <div className="min-h-screen bg-background-main flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-background-secondary rounded-2xl p-8 border border-border-color">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            
            <h1 className="text-2xl font-bold text-foreground-primary mb-4">
              Invalid Reset Link
            </h1>
            
            <p className="text-foreground-secondary mb-6">
              {error}
            </p>
            
            <div className="space-y-3">
              <Link
                href="/forgot-password"
                className="w-full bg-accent-primary hover:bg-accent-primary-hover text-white font-semibold py-3 px-4 rounded-lg transition-all inline-block"
              >
                Request New Reset Link
              </Link>
              <Link
                href="/login"
                className="w-full bg-background-main hover:bg-background-tertiary text-foreground-primary font-medium py-3 px-4 rounded-lg transition-all border border-border-color inline-block"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-main flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2">
            <div className="w-12 h-12 bg-accent-primary rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-foreground-primary">TechCalendar</span>
          </Link>
          
          {!isSuccess ? (
            <>
              <h2 className="mt-6 text-3xl font-bold text-foreground-primary">
                Set your new password
              </h2>
              <p className="mt-2 text-sm text-foreground-secondary">
                Choose a strong password for your account
              </p>
            </>
          ) : (
            <>
              <h2 className="mt-6 text-3xl font-bold text-foreground-primary">
                Password updated!
              </h2>
              <p className="mt-2 text-sm text-foreground-secondary">
                Your password has been successfully changed
              </p>
            </>
          )}
        </div>

        {/* Form or Success Message */}
        <div className="bg-background-secondary rounded-2xl p-8 border border-border-color">
          {!isSuccess ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Password Fields */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground-primary mb-2">
                  New Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-background-main border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent text-foreground-primary"
                  placeholder="••••••••"
                />
                <p className="mt-1 text-xs text-foreground-tertiary">
                  Must be at least 8 characters long
                </p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground-primary mb-2">
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-background-main border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent text-foreground-primary"
                  placeholder="••••••••"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-accent-primary hover:bg-accent-primary-hover text-white font-semibold py-3 px-4 rounded-lg transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </span>
                ) : (
                  'Update password'
                )}
              </button>
            </form>
          ) : (
            /* Success State */
            <div className="text-center space-y-6">
              {/* Success Icon */}
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              {/* Success Message */}
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                Your password has been successfully updated! You&apos;re now signed in.
              </div>

              {/* Auto-redirect notice */}
              <div className="text-sm text-foreground-secondary">
                <p>You&apos;ll be redirected to your dashboard in a few seconds...</p>
              </div>

              {/* Manual redirect button */}
              <Link
                href="/dashboard"
                className="w-full bg-accent-primary hover:bg-accent-primary-hover text-white font-semibold py-3 px-4 rounded-lg transition-all inline-block"
              >
                Go to Dashboard
              </Link>
            </div>
          )}
        </div>

        {/* Security Notice */}
        {!isSuccess && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <div className="text-sm">
                <p className="font-medium text-blue-800">Security Tip</p>
                <p className="text-blue-700 mt-1">
                  Choose a strong password that includes uppercase and lowercase letters, numbers, and special characters.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}