// src/components/common/ErrorBoundary.tsx
'use client';

import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { WarningOctagonIcon, ArrowClockwiseIcon, BugIcon } from '@phosphor-icons/react';
import * as Sentry from '@sentry/nextjs';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    name?: string;
    level?: 'page' | 'section' | 'component';
    onError?: (error: Error) => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
    retryCount: number;
}

// Simplified fallback UI
const ErrorFallback: React.FC<{
    level: 'page' | 'section' | 'component';
    error: Error | null;
    name?: string;
    retryCount: number;
    onReset: () => void;
}> = ({ level, error, name, retryCount, onReset }) => {
    const canRetry = retryCount < 2; // Max 2 retries
    const showDetails = process.env.NODE_ENV === 'development';
    
    if (level === 'page') {
        return (
            <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'hsl(var(--background))' }}>
                <div className="max-w-md w-full text-center">
                    <div className="bg-card rounded-lg p-6 border shadow-sm">
                        <BugIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
                        <p className="text-muted-foreground mb-4">
                            {name ? `The ${name} page` : 'This page'} encountered an error.
                        </p>
                        <div className="space-y-2">
                            {canRetry && (
                                <Button onClick={onReset} className="w-full">
                                    <ArrowClockwiseIcon className="w-4 h-4 mr-2" />
                                    Try Again
                                </Button>
                            )}
                            <Button 
                                variant="outline" 
                                onClick={() => window.location.href = '/'}
                                className="w-full"
                            >
                                Go Home
                            </Button>
                        </div>
                        {showDetails && error && (
                            <details className="mt-4 text-left">
                                <summary className="text-xs text-muted-foreground cursor-pointer">
                                    Error Details
                                </summary>
                                <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                                    {error.message}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            </div>
        );
    }
    
    if (level === 'section') {
        return (
            <div className="bg-card border rounded-lg p-4 text-center">
                <WarningOctagonIcon className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                <p className="text-sm font-medium mb-2">
                    {name ? `${name} section` : 'This section'} is temporarily unavailable
                </p>
                {canRetry && (
                    <Button onClick={onReset} variant="outline" size="sm">
                        <ArrowClockwiseIcon className="w-4 h-4 mr-1" />
                        Retry
                    </Button>
                )}
            </div>
        );
    }
    
    // Component level (default)
    return (
        <div className="border border-orange-200 bg-orange-50 rounded p-3 text-center">
            <WarningOctagonIcon className="w-5 h-5 text-orange-600 mx-auto mb-1" />
            <p className="text-xs text-orange-800 mb-1">
                {name || 'Component'} error
            </p>
            {canRetry && (
                <button 
                    onClick={onReset}
                    className="text-xs text-orange-600 underline hover:text-orange-800"
                >
                    Retry
                </button>
            )}
        </div>
    );
};

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        retryCount: 0,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { 
            hasError: true,
            error,
            retryCount: 0,
        };
    }

    public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        const { name, onError } = this.props;
        
        // Log error
        console.error(`[ErrorBoundary${name ? `:${name}` : ''}]`, error, errorInfo);
        
        // Report to Sentry
        Sentry.withScope((scope) => {
            if (name) scope.setTag('component', name);
            scope.setContext('errorInfo', {
                componentStack: errorInfo.componentStack,
            });
            Sentry.captureException(error);
        });

        // Call custom error handler
        onError?.(error);
    }

    private resetState = () => {
        this.setState(prevState => ({
            hasError: false,
            error: null,
            retryCount: prevState.retryCount + 1,
        }));
    };

    public render() {
        if (this.state.hasError) {
            const { fallback, level = 'component', name } = this.props;

            if (fallback) {
                return fallback;
            }

            return (
                <ErrorFallback 
                    level={level}
                    error={this.state.error}
                    name={name}
                    retryCount={this.state.retryCount}
                    onReset={this.resetState}
                />
            );
        }

        return this.props.children;
    }
}

// Simple convenience components
export const PageErrorBoundary: React.FC<Omit<Props, 'level'>> = (props) => (
    <ErrorBoundary level="page" {...props} />
);

export const SectionErrorBoundary: React.FC<Omit<Props, 'level'>> = (props) => (
    <ErrorBoundary level="section" {...props} />
);