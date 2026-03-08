'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DashboardCardProps {
    title: string;
    description?: string;
    children: React.ReactNode;
    className?: string;
    variant?: 'default' | 'elevated' | 'outlined';
    size?: 'sm' | 'md' | 'lg';
    presentation?: 'default' | 'mobile-dashboard';
    loading?: boolean;
    error?: string;
    onRetry?: () => void;
    onClick?: () => void;
    noBorder?: boolean;
}

export function DashboardCard({
    title,
    description,
    children,
    className,
    variant = 'default',
    size = 'md',
    presentation = 'default',
    loading = false,
    error,
    onRetry,
    onClick,
    noBorder = false
}: DashboardCardProps) {
    const isMobileDashboard = presentation === 'mobile-dashboard';
    const baseClasses = cn(
        'transition-all duration-200 overflow-hidden',
        isMobileDashboard ? 'dashboard-card-mobile' : 'rounded-xl'
    );

    const variantClasses = {
        default: "bg-white dark:bg-[#0A0A0A] border border-zinc-200/50 dark:border-white/[0.05] shadow-sm",
        elevated: "bg-white dark:bg-[#0A0A0A] shadow-md hover:shadow-lg border border-zinc-200/50 dark:border-white/[0.05]",
        outlined: "bg-transparent border border-zinc-200/50 dark:border-white/[0.05]"
    };
    
    const borderClasses = noBorder ? "border-0" : "";

    const sizeClasses = {
        sm: "p-4",
        md: "p-6",
        lg: "p-8"
    };

    if (loading) {
        return (
            <Card
                className={cn(baseClasses, isMobileDashboard ? undefined : variantClasses[variant], borderClasses, className)}
                data-dashboard-presentation={presentation}
            >
                <CardHeader className={cn(isMobileDashboard ? "dashboard-card-mobile-header" : "pb-4")}>
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    {description && <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-2 w-3/4" />}
                </CardHeader>
                <CardContent className={cn(isMobileDashboard ? "dashboard-card-mobile-content" : sizeClasses[size])}>
                    <div className="space-y-3">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-5/6" />
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-4/6" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card
                className={cn(baseClasses, isMobileDashboard ? undefined : variantClasses[variant], borderClasses, className)}
                data-dashboard-presentation={presentation}
            >
                <CardHeader className={cn(isMobileDashboard ? "dashboard-card-mobile-header" : "pb-4")}>
                    <CardTitle className={cn("text-lg font-semibold text-gray-900 dark:text-white", isMobileDashboard && "dashboard-card-mobile-title")}>{title}</CardTitle>
                    {description && <CardDescription className={cn("text-gray-600 dark:text-gray-400", isMobileDashboard && "dashboard-card-mobile-description")}>{description}</CardDescription>}
                </CardHeader>
                <CardContent className={cn(isMobileDashboard ? "dashboard-card-mobile-content" : sizeClasses[size])}>
                    <div className="text-center py-8">
                        <div className="text-4xl mb-4">⚠️</div>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
                        {onRetry && (
                            <button
                                onClick={onRetry}
                                className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors font-medium"
                            >
                                Try Again
                            </button>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card
            className={cn(baseClasses, isMobileDashboard ? undefined : variantClasses[variant], borderClasses, className)}
            onClick={onClick}
            data-dashboard-presentation={presentation}
        >
            <CardHeader className={cn(isMobileDashboard ? "dashboard-card-mobile-header" : "pb-4")}>
                <CardTitle className={cn("text-lg font-semibold text-gray-900 dark:text-white", isMobileDashboard && "dashboard-card-mobile-title")}>{title}</CardTitle>
                {description && <CardDescription className={cn("text-gray-600 dark:text-gray-400", isMobileDashboard && "dashboard-card-mobile-description")}>{description}</CardDescription>}
            </CardHeader>
            <CardContent className={cn(isMobileDashboard ? "dashboard-card-mobile-content" : sizeClasses[size])}>
                {children}
            </CardContent>
        </Card>
    );
}
