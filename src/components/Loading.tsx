import React from 'react';

import { BrandLoadingLogo } from '@/components/brand/BrandLoadingLogo';

// --- Main Loading Components (Unchanged) ---
export default function Loading() {
    return (
        <div className="min-h-screen bg-background-main flex items-center justify-center">
            <div className="flex items-center justify-center rounded-[28px] border border-border-default bg-background-secondary/70 p-8 shadow-[var(--shadow-lg)] backdrop-blur-sm">
                <BrandLoadingLogo className="text-foreground-primary" size={72} />
            </div>
        </div>
    );
}

// --- Skeleton Components ---

// ✅ FIXED: CalendarSkeleton now renders a consistent, static structure
export function CalendarSkeleton() {
    return (
        <div className="p-6">
            {/* Header skeleton */}
            <div className="flex items-center justify-between mb-6 animate-pulse">
                <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 bg-background-secondary rounded" />
                    <div className="w-16 h-6 bg-background-secondary rounded" />
                    <div className="w-8 h-8 bg-background-secondary rounded" />
                </div>
                <div className="w-32 h-8 bg-background-secondary rounded" />
                <div className="flex space-x-2">
                    <div className="w-16 h-8 bg-background-secondary rounded" />
                    <div className="w-16 h-8 bg-background-secondary rounded" />
                    <div className="w-16 h-8 bg-background-secondary rounded" />
                </div>
            </div>

            {/* Calendar grid skeleton */}
            <div className="bg-background-secondary rounded-xl border border-border-color animate-pulse">
                {/* Weekdays */}
                <div className="grid grid-cols-7 border-b border-border-color">
                    {Array.from({ length: 7 }).map((_, i) => (
                        <div key={i} className="p-3 text-center">
                            <div className="w-8 h-4 bg-background-tertiary rounded mx-auto" />
                        </div>
                    ))}
                </div>

                {/* Calendar days */}
                <div className="grid grid-cols-7">
                    {Array.from({ length: 35 }).map((_, i) => (
                        <div key={i} className="border-r border-b border-border-color p-2 min-h-[120px] last:border-r-0">
                            <div className="w-6 h-4 bg-background-tertiary rounded mb-2" />
                            <div className="space-y-1">
                                {/* Static placeholders instead of random ones */}
                                {(i % 4 === 1) && <div className="w-full h-5 bg-background-tertiary rounded" />}
                                {(i % 4 === 2) && <div className="w-3/4 h-5 bg-background-tertiary rounded" />}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}


export function SidebarSkeleton() {
    return (
        <div className="p-6 space-y-6 animate-pulse">
            <div>
                <div className="w-32 h-6 bg-background-secondary rounded mb-4" />
                <div className="space-y-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="flex items-center space-x-3 p-3 bg-background-secondary rounded-lg border border-border-color">
                            <div className="w-3 h-3 bg-accent-primary/20 rounded-full" />
                            <div className="flex-1 h-4 bg-background-tertiary rounded" />
                            <div className="w-5 h-5 bg-background-tertiary rounded" />
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex space-x-2">
                <div className="flex-1 h-10 bg-background-secondary rounded" />
                <div className="flex-1 h-10 bg-background-secondary rounded" />
            </div>
        </div>
    );
}

export function LoadingButton({ loading, children, onClick, disabled = false, className = '', variant = 'primary' }: { loading: boolean, children: React.ReactNode, onClick?: () => void, disabled?: boolean, className?: string, variant?: 'primary' | 'secondary' | 'danger' }) {
    const baseClasses = 'flex items-center justify-center space-x-2 font-medium py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed';
    const variantClasses = {
        primary: 'bg-accent-primary hover:bg-accent-primary-hover text-white',
        secondary: 'bg-background-secondary hover:bg-background-tertiary text-foreground-primary border border-border-color',
        danger: 'bg-red-600 hover:bg-red-700 text-white'
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled || loading}
            className={`${baseClasses} ${variantClasses[variant]} ${className}`}
        >
            {loading && (
                <BrandLoadingLogo
                    className="-ml-1 mr-2 h-4 w-4 shrink-0"
                    inline
                    label={null}
                    size={16}
                />
            )}
            <span>{children}</span>
        </button>
    );
}

export function ErrorState({
    error,
    onRetry,
    className = ''
}: {
    error: string;
    onRetry?: () => void;
    className?: string;
}) {
    return (
        <div className={`flex flex-col items-center justify-center p-8 text-center bg-red-50 border border-red-200 rounded-lg ${className}`}>
            <svg className="w-12 h-12 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h3 className="text-lg font-medium text-red-800 mb-2">
                Something went wrong
            </h3>
            <p className="text-red-700 mb-6">
                {error}
            </p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                    Try Again
                </button>
            )}
        </div>
    );
}

export function SmartLoader({
    loading,
    error,
    children,
    skeleton,
    onRetry,
    isBackgroundRefetch = false
}: {
    loading: boolean;
    error?: string | null;
    children: React.ReactNode;
    skeleton: React.ReactNode;
    onRetry?: () => void;
    isBackgroundRefetch?: boolean;
}) {
    // Show full skeleton only for initial load (no background refetch)
    if (loading && !isBackgroundRefetch) return <>{skeleton}</>;

    if (error) {
        return <ErrorState error={error} onRetry={onRetry} />;
    }

    // Show children with no additional indicator during background refetch
    // Individual views handle their own loading indicators (e.g., spinner in search input)
    return <>{children}</>;
}
