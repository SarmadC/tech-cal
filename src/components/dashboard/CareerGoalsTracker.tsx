'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useTimelineTheme } from '@/hooks/useTimelineTheme';
import { Target, CheckCircle, Clock, TrendUp } from '@phosphor-icons/react';
import type { CareerProfile, TrackedEventRecord, Event, CareerGoal } from '@/types';

interface CareerGoalsTrackerProps {
  careerProfile: CareerProfile;
  trackedEvents: TrackedEventRecord[];
  upcomingEvents: Event[];
}

const GOAL_CONFIGS: Record<CareerGoal, {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
  targetEvents: number;
}> = {
  'skill-development': {
    icon: TrendUp,
    color: 'text-blue-600 dark:text-blue-400',
    description: 'Attend workshops and training sessions',
    targetEvents: 12
  },
  'career-advancement': {
    icon: Target,
    color: 'text-purple-600 dark:text-purple-400',
    description: 'Build leadership and management skills',
    targetEvents: 8
  },
  'role-transition': {
    icon: CheckCircle,
    color: 'text-green-600 dark:text-green-400',
    description: 'Learn new role-specific skills',
    targetEvents: 10
  },
  'leadership-growth': {
    icon: Target,
    color: 'text-orange-600 dark:text-orange-400',
    description: 'Develop leadership capabilities',
    targetEvents: 6
  },
  'entrepreneurship': {
    icon: TrendUp,
    color: 'text-red-600 dark:text-red-400',
    description: 'Build business and startup skills',
    targetEvents: 8
  },
  'consulting': {
    icon: CheckCircle,
    color: 'text-indigo-600 dark:text-indigo-400',
    description: 'Develop consulting expertise',
    targetEvents: 6
  },
  'specialization': {
    icon: Target,
    color: 'text-teal-600 dark:text-teal-400',
    description: 'Become a domain expert',
    targetEvents: 15
  },
  'generalization': {
    icon: TrendUp,
    color: 'text-pink-600 dark:text-pink-400',
    description: 'Broaden your skill set',
    targetEvents: 12
  },
  'networking': {
    icon: CheckCircle,
    color: 'text-yellow-600 dark:text-yellow-400',
    description: 'Build professional connections',
    targetEvents: 10
  },
  'industry-change': {
    icon: Target,
    color: 'text-cyan-600 dark:text-cyan-400',
    description: 'Learn new industry specifics',
    targetEvents: 8
  },
  'work-life-balance': {
    icon: CheckCircle,
    color: 'text-emerald-600 dark:text-emerald-400',
    description: 'Find sustainable work practices',
    targetEvents: 4
  },
  'salary-increase': {
    icon: TrendUp,
    color: 'text-amber-600 dark:text-amber-400',
    description: 'Build valuable skills',
    targetEvents: 6
  }
};

export function CareerGoalsTracker({
  careerProfile,
  trackedEvents,
  upcomingEvents
}: CareerGoalsTrackerProps) {
  const theme = useTimelineTheme();

  // Calculate progress for each goal
  const goalProgress = useMemo(() => {
    // Only count ATTENDED events
    const attendedEvents = trackedEvents.filter(e => e.status === 'attended');

    return careerProfile.careerGoals.map(goal => {
      const config = GOAL_CONFIGS[goal];
      const eventsAttended = attendedEvents.length; // Count attended events only
      const progress = Math.min(Math.round((eventsAttended / config.targetEvents) * 100), 100);

      // Count relevant upcoming events
      const relevantUpcoming = upcomingEvents.slice(0, 5).length;

      return {
        goal,
        config,
        eventsAttended,
        progress,
        relevantUpcoming,
        targetEvents: config.targetEvents
      };
    });
  }, [careerProfile.careerGoals, trackedEvents, upcomingEvents]);

  // Calculate timeframe progress
  const timeframeProgress = useMemo(() => {
    const timeframeMonths = {
      'immediate': 6,
      'short-term': 18,
      'medium-term': 36,
      'long-term': 60
    };

    const totalMonths = timeframeMonths[careerProfile.timeframe];
    const monthsPassed = 3; // Simplified: assume 3 months since profile creation
    return Math.min(Math.round((monthsPassed / totalMonths) * 100), 100);
  }, [careerProfile.timeframe]);

  return (
    <Card className={`border ${theme.borderCard}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className={`text-lg ${theme.textPrimary}`}>Career Goals</CardTitle>
            <CardDescription className={theme.textSecondary}>
              {careerProfile.careerGoals.length} active goals • {careerProfile.timeframe.replace('-', ' ')} timeframe
            </CardDescription>
          </div>
          <Target className={`w-5 h-5 ${theme.textMuted}`} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Timeframe Progress */}
        <div className={`p-4 rounded-lg border ${theme.borderCard}`}>
          <div className="flex items-center gap-2 mb-2">
            <Clock className={`w-4 h-4 ${theme.textPrimary}`} />
            <span className={`text-sm font-semibold ${theme.textPrimary}`}>Time Progress</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={`text-xl font-bold ${theme.textPrimary}`}>{timeframeProgress}%</span>
              <span className={`text-xs ${theme.textMuted}`}>of {careerProfile.timeframe} period</span>
            </div>
            <Progress value={timeframeProgress} className="h-2" />
          </div>
        </div>

        {/* Individual Goals */}
        <div className="space-y-3">
          {goalProgress.map(({ goal, config, eventsAttended, progress, relevantUpcoming, targetEvents }) => {
            const Icon = config.icon;
            return (
              <div
                key={goal}
                className={`p-4 rounded-lg border ${theme.borderCard} hover:${theme.hoverCard} transition-colors`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`p-2 rounded-lg border ${theme.borderCard}`}>
                        <Icon className={`w-4 h-4 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-sm font-semibold ${theme.textPrimary} capitalize`}>
                          {goal.replace('-', ' ')}
                        </h4>
                        <p className={`text-xs ${theme.textMuted}`}>{config.description}</p>
                      </div>
                    </div>
                    <Badge variant={progress >= 100 ? "default" : "secondary"} className="ml-2">
                      {progress}%
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className={theme.textMuted}>
                        {eventsAttended} / {targetEvents} events
                      </span>
                      {relevantUpcoming > 0 && (
                        <span className={theme.textMuted}>
                          {relevantUpcoming} upcoming
                        </span>
                      )}
                    </div>
                    <Progress value={progress} className="h-1.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Overall Progress Summary */}
        <div className={`p-4 rounded-lg border ${theme.borderCard} bg-muted/50`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-semibold ${theme.textPrimary}`}>Overall Progress</p>
              <p className={`text-xs ${theme.textMuted}`}>
                {trackedEvents.filter(e => e.status === 'attended').length} events attended
              </p>
            </div>
            <CheckCircle className={`w-5 h-5 ${theme.statusSuccess}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
