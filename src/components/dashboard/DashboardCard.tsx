import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DashboardCardProps {
  title?: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
}

/**
 * Reusable dashboard card with consistent styling
 */
export function DashboardCard({
  title,
  icon: Icon,
  children,
  className = '',
  headerClassName = '',
  contentClassName = ''
}: DashboardCardProps) {
  return (
    <Card className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700 ${className}`}>
      {title && (
        <CardHeader className={`pb-3 ${headerClassName}`}>
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            {Icon && <Icon className="w-5 h-5 text-blue-600" />}
            {title}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={contentClassName}>
        {children}
      </CardContent>
    </Card>
  );
}
