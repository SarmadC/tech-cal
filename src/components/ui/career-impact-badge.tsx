import React from 'react';
import { Badge } from './badge';
import { CareerImpactScoreLite } from '@/types/careerImpact';
import type { CareerImpactScore } from '@/types';
import { CareerImpactUtils } from '@/utils/careerImpactUtils';
import { cn } from '@/lib/utils';

interface CareerImpactBadgeProps {
  score: CareerImpactScore | CareerImpactScoreLite | number;
  variant?: 'default' | 'compact' | 'detailed';
  showTooltip?: boolean;
  className?: string;
}

/**
 * Career Impact Badge component for displaying career relevance scores
 */
export function CareerImpactBadge({ 
  score, 
  variant = 'default', 
  showTooltip = false,
  className 
}: CareerImpactBadgeProps) {
  // Extract score value
  const scoreValue = typeof score === 'number' ? score : score.overall;

  // Get display properties
  const displayText = CareerImpactUtils.formatScore(scoreValue);
  const badgeVariant = CareerImpactUtils.getScoreBadgeVariant(scoreValue);
  const colorClass = CareerImpactUtils.getScoreColor(scoreValue);

  // Render based on variant
  if (variant === 'compact') {
    return (
      <Badge 
        variant={badgeVariant}
        className={cn('text-xs font-medium', className)}
        title={showTooltip ? `Career Impact: ${scoreValue}/100` : undefined}
      >
        {Math.round(scoreValue)}
      </Badge>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Badge variant={badgeVariant} className="text-xs font-medium">
          {displayText}
        </Badge>
        <span className={cn('text-xs font-medium', colorClass)}>
          {Math.round(scoreValue)}/100
        </span>
      </div>
    );
  }

  // Default variant
  return (
    <Badge 
      variant={badgeVariant}
      className={cn('text-xs font-medium', className)}
      title={showTooltip ? `Career Impact: ${displayText} (${scoreValue}/100)` : undefined}
    >
      {displayText}
    </Badge>
  );
}


/**
 * Career Impact Score Display component for showing detailed scores
 */
interface CareerImpactScoreProps {
  score: CareerImpactScore | CareerImpactScoreLite;
  variant?: 'minimal' | 'standard' | 'detailed';
  showConfidence?: boolean;
  className?: string;
}

export function CareerImpactScore({ 
  score, 
  variant = 'standard',
  showConfidence = false,
  className 
}: CareerImpactScoreProps) {
  const scoreValue = score.overall;
  const confidence = score.confidence;
  
  const colorClass = CareerImpactUtils.getScoreColor(scoreValue);

  if (variant === 'minimal') {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        <div className={cn('w-2 h-2 rounded-full', getBgColorClass(scoreValue))} />
        <span className={cn('text-sm font-medium', colorClass)}>
          {Math.round(scoreValue)}
        </span>
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className={cn('flex flex-col gap-1', className)}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Career Impact</span>
          <CareerImpactBadge score={score} variant="compact" />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-200 rounded-full h-1.5">
            <div 
              className={cn('h-1.5 rounded-full', getBgColorClass(scoreValue))}
              style={{ width: `${scoreValue}%` }}
            />
          </div>
          <span className={cn('text-xs font-medium', colorClass)}>
            {Math.round(scoreValue)}
          </span>
        </div>
        {showConfidence && (
          <div className="text-xs text-gray-500">
            Confidence: {Math.round(confidence * 100)}%
          </div>
        )}
      </div>
    );
  }

  // Standard variant
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="text-sm text-gray-600">Career Impact:</span>
      <CareerImpactBadge score={score} />
      {showConfidence && (
        <span className="text-xs text-gray-500">
          ({Math.round(confidence * 100)}% confidence)
        </span>
      )}
    </div>
  );
}

/**
 * Get background color class for score visualization
 */
function getBgColorClass(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-blue-500';
  if (score >= 40) return 'bg-yellow-500';
  return 'bg-red-500';
}
