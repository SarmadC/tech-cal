import React from 'react';
import { TrendUpIcon, FireIcon, ChartLineUpIcon } from '@phosphor-icons/react';
import { MetricCard } from './MetricCard';
import { useCareerMetrics } from '@/hooks/useCareerMetrics';
import type { Event, TrackedEventRecord } from '@/types';

interface OverviewPanelProps {
  allEvents: Event[];
  trackedEvents: TrackedEventRecord[];
  className?: string;
}

export function OverviewPanel({ allEvents, trackedEvents, className = '' }: OverviewPanelProps) {
  const careerMetrics = useCareerMetrics(allEvents, trackedEvents);

  const pipelineTip = careerMetrics.pipeline.trackedUpcomingCount > 0
    ? `${careerMetrics.pipeline.highFitCount} high-fit of ${careerMetrics.pipeline.trackedUpcomingCount} saved or RSVP'd events`
    : 'Save or RSVP to upcoming events to score your pipeline';
  const outcomeTip = careerMetrics.feedback.feedbackCount > 0
    ? `${careerMetrics.feedback.feedbackCount} rated events${careerMetrics.feedback.recommendationRate !== null
      ? ` · ${Math.round(careerMetrics.feedback.recommendationRate)}% would recommend`
      : ''}`
    : 'Rate attended events to unlock outcome insights';

  return (
    <div className={className}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6">
        <MetricCard
          title="Pipeline Fit"
          value={careerMetrics.pipeline.scoredUpcomingCount > 0 ? careerMetrics.pipeline.avgScore : '—'}
          icon={TrendUpIcon}
          iconColor="text-blue-600 dark:text-blue-400"
          iconBgColor="bg-blue-100 dark:bg-blue-900/30"
          description={pipelineTip}
          progress={careerMetrics.pipeline.trackedUpcomingCount > 0 ? {
            value: careerMetrics.pipeline.highFitCount,
            max: careerMetrics.pipeline.trackedUpcomingCount,
            label: 'High-fit upcoming'
          } : undefined}
          className="h-full"
        />

        <MetricCard
          title="Learning Streak"
          value={`${careerMetrics.learningStreak.months} months`}
          icon={FireIcon}
          iconColor={careerMetrics.learningStreak.isActive ? 'text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400'}
          iconBgColor={careerMetrics.learningStreak.isActive ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-gray-100 dark:bg-gray-900/30'}
          description={careerMetrics.learningStreak.isActive ? 'Currently active streak' : 'Skill-building consistency'}
          className="h-full"
        />

        <MetricCard
          title="Outcome Rating"
          value={careerMetrics.feedback.averageRating !== null
            ? `${careerMetrics.feedback.averageRating.toFixed(1)}/5`
            : '—'}
          icon={ChartLineUpIcon}
          iconColor={careerMetrics.feedback.averageRating !== null
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-gray-600 dark:text-gray-400'}
          iconBgColor={careerMetrics.feedback.averageRating !== null
            ? 'bg-emerald-100 dark:bg-emerald-900/30'
            : 'bg-gray-100 dark:bg-gray-900/30'}
          description={outcomeTip}
          className="col-span-2 h-full md:col-span-1"
        />
      </div>
    </div>
  );
}
