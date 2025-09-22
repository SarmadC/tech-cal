import React from 'react';
import { CareerImpactScore } from '@/types';
import { CareerImpactUtils } from '@/utils/careerImpactUtils';
import { cn } from '@/lib/utils';

interface CareerImpactTooltipProps {
  score: CareerImpactScore;
  isVisible: boolean;
  position?: { x: number; y: number };
  className?: string;
}

/**
 * Career Impact Tooltip component for showing detailed explanations
 */
export function CareerImpactTooltip({ 
  score, 
  isVisible, 
  position,
  className 
}: CareerImpactTooltipProps) {
  if (!isVisible) return null;

  const { overall, confidence, components, explanation } = score;

  return (
    <div 
      className={cn(
        'absolute z-50 w-80 p-4 bg-white border border-gray-200 rounded-lg shadow-lg',
        'transform -translate-x-1/2 -translate-y-full',
        className
      )}
      style={position ? { 
        left: position.x, 
        top: position.y - 10 
      } : undefined}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-900">Career Impact Analysis</h4>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-gray-900">{Math.round(overall)}</span>
          <span className="text-sm text-gray-500">/100</span>
        </div>
      </div>

      {/* Category and Confidence */}
      <div className="flex items-center justify-between mb-3 text-sm">
        <span className="px-2 py-1 rounded-md bg-gray-100 text-gray-700 capitalize">
          {explanation.careerImpactCategory} Impact
        </span>
        <span className="text-gray-500">
          {Math.round(confidence * 100)}% confidence
        </span>
      </div>

      {/* Component Breakdown */}
      <div className="space-y-2 mb-3">
        <h5 className="text-sm font-medium text-gray-700">Score Breakdown:</h5>
        {Object.entries(components).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between text-sm">
            <span className="text-gray-600 capitalize">
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </span>
            <div className="flex items-center gap-2">
              <div className="w-16 bg-gray-200 rounded h-1.5">
                <div 
                  className="h-1.5 rounded bg-blue-500"
                  style={{ width: `${Number(value)}%` }}
                />
              </div>
              <span className="w-8 text-right text-gray-700">{Math.round(Number(value))}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Key Reasons */}
      {explanation.reasons.length > 0 && (
        <div className="mb-3">
          <h5 className="text-sm font-medium text-gray-700 mb-2">Why this matters:</h5>
          <ul className="text-sm text-gray-600 space-y-1">
            {explanation.reasons.slice(0, 3).map((reason: string, index: number) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">•</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Matched Skills */}
      {explanation.matchedSkills.length > 0 && (
        <div className="mb-3">
          <h5 className="text-sm font-medium text-gray-700 mb-2">Relevant Skills:</h5>
          <div className="flex flex-wrap gap-1">
            {explanation.matchedSkills.slice(0, 4).map((skill: string, index: number) => (
              <span 
                key={index}
                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-md"
              >
                {skill}
              </span>
            ))}
            {explanation.matchedSkills.length > 4 && (
              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded-md">
                +{explanation.matchedSkills.length - 4} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Arrow pointer */}
      <div className="absolute top-full left-1/2 transform -translate-x-1/2">
        <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-200" />
        <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white absolute -top-px left-1/2 transform -translate-x-1/2" />
      </div>
    </div>
  );
}

/**
 * Lightweight Career Impact Indicator for compact spaces
 */
interface CareerImpactIndicatorProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  className?: string;
}

export function CareerImpactIndicator({ 
  score, 
  size = 'md',
  showValue = false,
  className 
}: CareerImpactIndicatorProps) {
  const colorClass = CareerImpactUtils.getScoreColor(score);
  const bgColorClass = getBgColorClass(score);
  
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div 
        className={cn('rounded-full', sizeClasses[size], bgColorClass)}
        title={`Career Impact: ${Math.round(score)}/100`}
      />
      {showValue && (
        <span className={cn('text-xs font-medium', colorClass)}>
          {Math.round(score)}
        </span>
      )}
    </div>
  );
}

/**
 * Get background color class for score dots
 */
function getBgColorClass(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-blue-500';
  if (score >= 40) return 'bg-yellow-500';
  return 'bg-red-500';
}
