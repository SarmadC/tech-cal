'use client';

import React from 'react';
import { Target, TrendUp, Clock, Info } from '@phosphor-icons/react';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import type { TrackedEventRecord, Event, CareerProfile } from '@/types';
import { getGoalTarget } from '@/utils/eventGoalAlignment';
import { Progress } from '@/components/ui/progress';

interface CareerProgressCardProps {
  trackedEvents: TrackedEventRecord[];
  upcomingEvents: Event[];
  careerProfile: CareerProfile | null;
}

const GOAL_ICONS = {
  'skill-development': TrendUp,
  'role-transition': Target,
  'leadership-growth': Target,
  'networking': Target,
} as const;

const GOAL_LABELS = {
  'skill-development': 'Skill Development',
  'role-transition': 'Role Transition',
  'leadership-growth': 'Leadership Growth',
  'networking': 'Networking',
} as const;

export function CareerProgressCard({
  trackedEvents,
  upcomingEvents,
  careerProfile,
}: CareerProgressCardProps) {
  const metrics = useDashboardMetrics({
    trackedEvents,
    upcomingEvents,
    careerProfile,
  });

  if (!careerProfile || metrics.goalProgress.length === 0) {
    return (
      <div className="glass-card glass-glow p-6">
        <div className="flex items-center gap-3 mb-4">
          <Target className="w-5 h-5 text-glass-secondary" weight="regular" />
          <h3 className="text-base font-medium text-glass-primary">Career Progress</h3>
        </div>
        <div className="text-center py-12">
          <Target className="w-12 h-12 text-glass-tertiary opacity-60 mx-auto mb-3" weight="regular" />
          <p className="text-sm font-medium text-glass-secondary mb-1">No career goals set</p>
          <p className="text-xs text-glass-tertiary">
            Update your career profile to track progress toward your goals
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card glass-glow p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-5 h-5 text-glass-secondary" weight="regular" />
            <h3 className="text-base font-medium text-glass-primary">Career Progress</h3>
          </div>
          <p className="text-sm text-glass-tertiary">
            Tracking progress toward your career goals
          </p>
        </div>
        {!metrics.hasComponentsData && (
          <div className="flex items-center gap-1.5 text-xs text-glass-tertiary">
            <Info className="w-3.5 h-3.5" weight="regular" />
            <span>Aggregate scoring</span>
          </div>
        )}
      </div>

      {/* Goal Progress List */}
      <div className="space-y-4">
        {metrics.goalProgress.map((goalData) => {
          const Icon = GOAL_ICONS[goalData.goal as keyof typeof GOAL_ICONS] || Target;
          const label = GOAL_LABELS[goalData.goal as keyof typeof GOAL_LABELS] || goalData.goal;
          const _target = getGoalTarget(goalData.goal as keyof typeof GOAL_LABELS);
          
          return (
            <div
              key={goalData.goal}
              className="p-4 rounded-xl border border-white/10 dark:border-white/10 light:border-black/10 hover:border-white/20 dark:hover:border-white/20 light:hover:border-black/15 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="p-2 rounded-lg border border-white/10 dark:border-white/10 light:border-black/10 bg-white/5 dark:bg-white/5 light:bg-black/5 flex-shrink-0">
                    <Icon className="w-4 h-4 text-glass-secondary" weight="regular" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-glass-primary capitalize line-clamp-1">
                      {label}
                    </h4>
                    <p className="text-xs text-glass-tertiary mt-0.5">
                      {goalData.eventCount} events • {goalData.impactTotal} total impact
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-lg font-bold text-glass-primary">{goalData.progress}%</span>
                </div>
              </div>

              <Progress value={goalData.progress} className="h-2 mb-2" />

              <div className="flex items-center justify-between text-xs">
                <span className="text-glass-tertiary">
                  {goalData.eventCount} events ({goalData.impactTotal} total impact)
                </span>
                {goalData.progress >= 100 && (
                  <span className="text-green-400 font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" weight="fill" />
                    Goal achieved
                  </span>
                )}
              </div>

              {/* Stubbed suggested action - neutral phrasing */}
              {goalData.progress < 100 && (
                <div className="mt-3 pt-3 border-t border-white/10 dark:border-white/10 light:border-black/10">
                  <p className="text-xs text-glass-secondary italic">
                    Continue attending relevant events to build impact
                  </p>
                  <p className="text-[10px] text-glass-tertiary opacity-60 mt-1">
                    * Progress weighted by career impact scores (0-100 scale)
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-6 border-t border-white/10 dark:border-white/10 light:border-black/10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-glass-tertiary uppercase tracking-wider mb-1">
              Overall Progress
            </p>
            <p className="text-sm text-glass-tertiary">
              {trackedEvents.filter(e => e.status === 'attended').length} events attended
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-glass-primary">
              {Math.round(
                metrics.goalProgress.reduce((sum, g) => sum + g.progress, 0) /
                  Math.max(metrics.goalProgress.length, 1)
              )}
              %
            </p>
            <p className="text-xs text-glass-tertiary">Average</p>
          </div>
        </div>
      </div>
    </div>
  );
}
