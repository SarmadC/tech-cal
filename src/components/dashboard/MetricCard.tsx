import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  iconBgColor?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'stable';
  };
  description?: string;
  progress?: {
    value: number;
    max?: number;
    label?: string;
  };
  className?: string;
}

/**
 * Reusable metric card component for dashboard
 */
export function MetricCard({
  title,
  value,
  icon: Icon,
  iconColor = 'text-blue-600 dark:text-blue-400',
  iconBgColor = 'bg-blue-100 dark:bg-blue-900/30',
  trend,
  description,
  progress,
  className = ''
}: MetricCardProps) {
  const trendIcon = trend?.direction === 'up' ? '↗' : 
                   trend?.direction === 'down' ? '↘' : '→';
  
  const trendColor = trend?.direction === 'up' ? 'text-green-600' : 
                    trend?.direction === 'down' ? 'text-red-600' : 'text-gray-500';

  const progressValue = progress ? (progress.value / (progress.max || 100)) * 100 : undefined;

  return (
    <Card className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              {title}
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {value}
              </p>
              {trend && (
                <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
                  <span>{trendIcon}</span>
                  <span>{Math.abs(trend.value)}%</span>
                </div>
              )}
            </div>
            {description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {description}
              </p>
            )}
          </div>
          <div className={`p-3 rounded-lg ${iconBgColor}`}>
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>
        </div>
        
        {progress && (
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
              <span>{progress.label || 'Progress'}</span>
              <span>{progress.value}/{progress.max || 100}</span>
            </div>
            <Progress 
              value={progressValue} 
              className="h-2"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
