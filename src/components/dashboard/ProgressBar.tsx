import React from 'react';

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  color?: string;
  bgColor?: string;
  height?: string;
  showPercentage?: boolean;
  className?: string;
}

/**
 * Reusable progress bar component with consistent styling
 */
export function ProgressBar({
  value,
  max = 100,
  label,
  color = 'bg-blue-500',
  bgColor = 'bg-blue-200 dark:bg-blue-800/30',
  height = 'h-2',
  showPercentage = true,
  className = ''
}: ProgressBarProps) {
  const percentage = Math.round((value / max) * 100);
  
  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </span>
          {showPercentage && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {percentage}%
            </span>
          )}
        </div>
      )}
      <div className={`w-full ${bgColor} rounded ${height}`}>
        <div 
          className={`${color} ${height} rounded transition-all duration-300`}
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>
    </div>
  );
}
