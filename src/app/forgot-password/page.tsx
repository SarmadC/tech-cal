// src/app/forgot-password/page.tsx

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setMessage('');

    // Basic validation
    if (!email.trim()) {
      setError('Email is required');
      setIsSubmitting(false);
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      setIsSubmitting(false);
      return;
    }

    const result = await resetPassword(email);
    
    if (result.success) {
      setIsSuccess(true);
      setMessage(result.message || 'Password reset email sent! Check your inbox.');
      setEmail(''); // Clear the form
    } else {
      setError(result.error || 'Failed to send reset email');
    }
    
    setIsSubmitting(false);
  };

  return (
    <ProtectedRoute allowUnauthenticated>
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
                  Forgot your password?
                </h2>
                <p className="mt-2 text-sm text-foreground-secondary">
                  No worries! Enter your email address and we&apos;ll send you a link to reset your password.
                </p>
              </>
            ) : (
              <>
                <h2 className="mt-6 text-3xl font-bold text-foreground-primary">
                  Check your email
                </h2>
                <p className="mt-2 text-sm text-foreground-secondary">
                  We&apos;ve sent password reset instructions to your email address.
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

                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground-primary mb-2">
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-background-main border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent text-foreground-primary"
                    placeholder="you@example.com"
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
                      Sending...
                    </span>
                  ) : (
                    'Send reset email'
                  )}
                </button>

                {/* Back to Login */}
                <div className="text-center">
                  <Link
                    href="/login"
                    className="text-sm font-medium text-accent-primary hover:text-accent-primary-hover"
                  >
                    ← Back to sign in
                  </Link>
                </div>
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
                  {message}
                </div>

                {/* Instructions */}
                <div className="text-sm text-foreground-secondary space-y-2">
                  <p>
                    Click the link in the email to reset your password. The link will expire in 1 hour for security reasons.
                  </p>
                  <p>
                    Don&apos;t see the email? Check your spam folder or{' '}
                    <button
                      onClick={() => {
                        setIsSuccess(false);
                        setMessage('');
                        setError('');
                      }}
                      className="text-accent-primary hover:underline"
                    >
                      try again
                    </button>
                    .
                  </p>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <Link
                    href="/login"
                    className="w-full bg-accent-primary hover:bg-accent-primary-hover text-white font-semibold py-3 px-4 rounded-lg transition-all inline-block text-center"
                  >
                    Back to sign in
                  </Link>
                  <Link
                    href="/"
                    className="w-full bg-background-main hover:bg-background-tertiary text-foreground-primary font-medium py-3 px-4 rounded-lg transition-all border border-border-color inline-block text-center"
                  >
                    Go home
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Help Text */}
          <div className="mt-8 text-center">
            <p className="text-xs text-foreground-tertiary">
              Need help?{' '}
              <Link href="/contact" className="text-accent-primary hover:underline">
                Contact support
              </Link>
            </p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}