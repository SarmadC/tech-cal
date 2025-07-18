// src/components/AuthErrorBoundary.tsx

'use client';

import React, { Component, ReactNode } from 'react';
import Link from 'next/link';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error to console for debugging
    console.error('Auth Error Boundary caught an error:', error, errorInfo);
    
    // Update state with error info
    this.setState({
      error,
      errorInfo
    });

    // You could also log the error to an error reporting service here
    // Example: logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="min-h-screen bg-background-main flex items-center justify-center px-4">
          <div className="max-w-lg w-full text-center">
            <div className="bg-background-secondary rounded-2xl p-8 border border-border-color">
              {/* Error Icon */}
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>

              <h1 className="text-2xl font-bold text-foreground-primary mb-4">
                Authentication Error
              </h1>

              <p className="text-foreground-secondary mb-6">
                Something went wrong with the authentication system. This might be a temporary issue.
              </p>

              {/* Error Details (only in development) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
                  <h3 className="font-semibold text-red-800 mb-2">Error Details:</h3>
                  <p className="text-sm text-red-700 font-mono">
                    {this.state.error.message}
                  </p>
                  {this.state.errorInfo && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-red-700 font-semibold">
                        Stack Trace
                      </summary>
                      <pre className="mt-2 text-xs text-red-600 whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={this.handleReset}
                  className="w-full bg-accent-primary hover:bg-accent-primary-hover text-white font-semibold py-3 px-4 rounded-lg transition-all"
                >
                  Try Again
                </button>
                
                <div className="flex space-x-3">
                  <Link
                    href="/login"
                    className="flex-1 bg-background-main hover:bg-background-tertiary text-foreground-primary font-medium py-3 px-4 rounded-lg transition-all border border-border-color text-center"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/"
                    className="flex-1 bg-background-main hover:bg-background-tertiary text-foreground-primary font-medium py-3 px-4 rounded-lg transition-all border border-border-color text-center"
                  >
                    Go Home
                  </Link>
                </div>
              </div>

              {/* Help Link */}
              <div className="mt-6 pt-6 border-t border-border-color">
                <p className="text-sm text-foreground-tertiary">
                  Need help?{' '}
                  <Link href="/contact" className="text-accent-primary hover:underline">
                    Contact support
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AuthErrorBoundary;

// Hook for functional components to handle auth errors
export function useAuthErrorHandler() {
  const handleAuthError = (error: Error, context: string = 'Authentication') => {
    console.error(`${context} error:`, error);
    
    // You could dispatch to a global error state or show a toast notification
    // For now, we'll just log it
    
    // In a real app, you might want to:
    // - Show a toast notification
    // - Redirect to an error page
    // - Log to an error monitoring service
    // - Clear auth state if it's corrupted
  };

  return { handleAuthError };
}

// Higher-order component version
export function withAuthErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  const WrappedComponent = (props: P) => {
    return (
      <AuthErrorBoundary fallback={fallback}>
        <Component {...props} />
      </AuthErrorBoundary>
    );
  };

  WrappedComponent.displayName = `withAuthErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

