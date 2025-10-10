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
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}

export function DashboardCard({
  title,
  description,
  children,
  className,
  variant = 'default',
  size = 'md',
  loading = false,
  error,
  onRetry
}: DashboardCardProps) {
  const baseClasses = "transition-all duration-200";

  const variantClasses = {
    default: "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md",
    elevated: "bg-white dark:bg-gray-900 shadow-md hover:shadow-lg border border-gray-200 dark:border-gray-800",
    outlined: "bg-transparent border-2 border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600"
  };

  const sizeClasses = {
    sm: "p-4",
    md: "p-6", 
    lg: "p-8"
  };

  if (loading) {
    return (
      <Card className={cn(baseClasses, variantClasses[variant], className)}>
        <CardHeader className="pb-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          {description && <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-2 w-3/4" />}
        </CardHeader>
        <CardContent className={sizeClasses[size]}>
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
      <Card className={cn(baseClasses, variantClasses[variant], className)}>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">{title}</CardTitle>
          {description && <CardDescription className="text-gray-600 dark:text-gray-400">{description}</CardDescription>}
        </CardHeader>
        <CardContent className={sizeClasses[size]}>
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
    <Card className={cn(baseClasses, variantClasses[variant], className)}>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">{title}</CardTitle>
        {description && <CardDescription className="text-gray-600 dark:text-gray-400">{description}</CardDescription>}
      </CardHeader>
      <CardContent className={sizeClasses[size]}>
        {children}
      </CardContent>
    </Card>
  );
}