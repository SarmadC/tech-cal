import React from 'react';
import { MetricCard } from './MetricCard';
import { TrendUpIcon, FireIcon, UsersIcon } from '@phosphor-icons/react';
import { useCareerMetrics } from '@/hooks/useCareerMetrics';
import type { Event, TrackedEventRecord } from '@/types';

interface OverviewPanelProps {
  allEvents: Event[];
  trackedEvents: TrackedEventRecord[];
  className?: string;
}

/**
 * Career-focused overview panel with intelligent metrics
 */
export function OverviewPanel({ allEvents, trackedEvents, className = '' }: OverviewPanelProps) {
  const careerMetrics = useCareerMetrics(allEvents, trackedEvents);

  return (
    <div className={`${className}`}>
      {/* Career Intelligence Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Career Impact Score"
          value={careerMetrics.careerImpactScore.value}
          icon={TrendUpIcon}
          iconColor="text-blue-600 dark:text-blue-400"
          iconBgColor="bg-blue-100 dark:bg-blue-900/30"
          trend={careerMetrics.careerImpactScore.trendPercentage > 0 ? {
            value: careerMetrics.careerImpactScore.trendPercentage,
            direction: careerMetrics.careerImpactScore.trend
          } : undefined}
          description={`Average relevance of your events${careerMetrics.careerImpactScore.roleWeighted ? ' (role-weighted)' : ''}`}
        />

        <MetricCard
          title="Learning Streak"
          value={`${careerMetrics.learningStreak.months} months`}
          icon={FireIcon}
          iconColor={careerMetrics.learningStreak.isActive ? "text-orange-600 dark:text-orange-400" : "text-gray-600 dark:text-gray-400"}
          iconBgColor={careerMetrics.learningStreak.isActive ? "bg-orange-100 dark:bg-orange-900/30" : "bg-gray-100 dark:bg-gray-900/30"}
          description={careerMetrics.learningStreak.isActive ? "Currently active streak" : "Skill-building consistency"}
        />

        <MetricCard
          title="Peer Comparison"
          value={`${careerMetrics.peerComparison.percentile}%`}
          icon={UsersIcon}
          iconColor={
            careerMetrics.peerComparison.comparison === 'above' ? "text-green-600 dark:text-green-400" :
            careerMetrics.peerComparison.comparison === 'below' ? "text-red-600 dark:text-red-400" :
            "text-yellow-600 dark:text-yellow-400"
          }
          iconBgColor={
            careerMetrics.peerComparison.comparison === 'above' ? "bg-green-100 dark:bg-green-900/30" :
            careerMetrics.peerComparison.comparison === 'below' ? "bg-red-100 dark:bg-red-900/30" :
            "bg-yellow-100 dark:bg-yellow-900/30"
          }
          description={`${careerMetrics.peerComparison.recommendation}${careerMetrics.peerComparison.sampleSize > 0 ? ` (${careerMetrics.peerComparison.sampleSize} peers)` : ''}`}
        />
      </div>
    </div>
  );
}
