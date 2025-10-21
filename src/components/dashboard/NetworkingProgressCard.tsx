'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useTimelineTheme } from '@/hooks/useTimelineTheme';
import { Users, UserPlus, Handshake, TrendUp } from '@phosphor-icons/react';
import type { CareerProfile, TrackedEventRecord, Event, NetworkingGoal } from '@/types';
import { doesEventMatchGoal } from '@/utils/eventGoalAlignment';

interface NetworkingProgressCardProps {
  careerProfile: CareerProfile;
  trackedEvents: TrackedEventRecord[];
  upcomingEvents: Event[];
}

const NETWORKING_GOAL_CONFIGS: Record<NetworkingGoal, {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
  targetEvents: number;
}> = {
  'find-mentors': {
    icon: Users,
    color: 'text-purple-600 dark:text-purple-400',
    description: 'Connect with senior professionals',
    targetEvents: 5
  },
  'find-mentees': {
    icon: UserPlus,
    color: 'text-blue-600 dark:text-blue-400',
    description: 'Help junior professionals grow',
    targetEvents: 5
  },
  'find-peers': {
    icon: Users,
    color: 'text-green-600 dark:text-green-400',
    description: 'Connect with same-level professionals',
    targetEvents: 8
  },
  'find-collaborators': {
    icon: Handshake,
    color: 'text-orange-600 dark:text-orange-400',
    description: 'Find project partners',
    targetEvents: 6
  },
  'find-customers': {
    icon: TrendUp,
    color: 'text-red-600 dark:text-red-400',
    description: 'Business development opportunities',
    targetEvents: 10
  },
  'find-employers': {
    icon: Users,
    color: 'text-indigo-600 dark:text-indigo-400',
    description: 'Explore job opportunities',
    targetEvents: 6
  },
  'find-employees': {
    icon: UserPlus,
    color: 'text-teal-600 dark:text-teal-400',
    description: 'Recruit talent for your team',
    targetEvents: 6
  },
  'industry-insights': {
    icon: TrendUp,
    color: 'text-pink-600 dark:text-pink-400',
    description: 'Learn about industry trends',
    targetEvents: 8
  },
  'thought-leadership': {
    icon: Users,
    color: 'text-yellow-600 dark:text-yellow-400',
    description: 'Establish expertise and visibility',
    targetEvents: 4
  }
};

export function NetworkingProgressCard({
  careerProfile,
  trackedEvents,
  upcomingEvents
}: NetworkingProgressCardProps) {
  const theme = useTimelineTheme();

  // Calculate networking metrics
  const networkingMetrics = useMemo(() => {
    // Only count ATTENDED networking-related events
    const attendedEvents = trackedEvents.filter(e => e.status === 'attended' && e.event);
    const networkingEvents = attendedEvents.filter(eventRecord => {
      if (!eventRecord.event) return false;
      return doesEventMatchGoal(eventRecord.event, 'networking');
    });

    const networkingProgress = careerProfile.networkingGoals.length > 0
      ? Math.min(Math.round((networkingEvents.length / 10) * 100), 100)
      : 0;

    // Find upcoming networking events
    const upcomingNetworking = upcomingEvents
      .filter(event => doesEventMatchGoal(event, 'networking'))
      .slice(0, 3);

    return {
      totalEvents: networkingEvents.length,
      progress: networkingProgress,
      upcomingNetworking
    };
  }, [careerProfile.networkingGoals, trackedEvents, upcomingEvents]);

  // Calculate goal progress
  const goalProgress = useMemo(() => {
    return careerProfile.networkingGoals.map(goal => {
      const config = NETWORKING_GOAL_CONFIGS[goal];
      // Simplified: use total networking events
      const progress = Math.min(
        Math.round((networkingMetrics.totalEvents / config.targetEvents) * 100),
        100
      );

      return {
        goal,
        config,
        progress,
        eventsCount: networkingMetrics.totalEvents,
        targetEvents: config.targetEvents
      };
    });
  }, [careerProfile.networkingGoals, networkingMetrics.totalEvents]);

  return (
    <Card className={`border ${theme.borderCard}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className={`text-lg ${theme.textPrimary}`}>Networking Progress</CardTitle>
            <CardDescription className={theme.textSecondary}>
              {networkingMetrics.totalEvents} networking events attended
            </CardDescription>
          </div>
          <Users className={`w-5 h-5 ${theme.textMuted}`} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className={`p-4 rounded-lg border ${theme.borderCard}`}>
          <div className="flex items-center gap-2 mb-3">
            <TrendUp className={`w-4 h-4 ${theme.textPrimary}`} />
            <h4 className={`text-sm font-semibold ${theme.textPrimary}`}>Overall Progress</h4>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={`text-2xl font-bold ${theme.textPrimary}`}>
                {networkingMetrics.progress}%
              </span>
              <span className={`text-sm ${theme.textMuted}`}>
                {networkingMetrics.totalEvents} events
              </span>
            </div>
            <Progress value={networkingMetrics.progress} className="h-2" />
          </div>
        </div>

        {/* Networking Goals */}
        {goalProgress.length > 0 && (
          <div className="space-y-3">
            <h4 className={`text-sm font-semibold ${theme.textPrimary}`}>Your Networking Goals</h4>
            <div className="space-y-2">
              {goalProgress.map(({ goal, config, progress, eventsCount, targetEvents }) => {
                const Icon = config.icon;
                return (
                  <div
                    key={goal}
                    className={`p-3 rounded-lg border ${theme.borderCard}`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg border ${theme.borderCard}`}>
                        <Icon className={`w-4 h-4 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className={`text-sm font-medium ${theme.textPrimary} capitalize`}>
                          {goal.replace('-', ' ')}
                        </h5>
                        <p className={`text-xs ${theme.textMuted}`}>{config.description}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {progress}%
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className={theme.textMuted}>
                          {eventsCount} / {targetEvents} events
                        </span>
                      </div>
                      <Progress value={progress} className="h-1" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Upcoming Networking Events */}
        {networkingMetrics.upcomingNetworking.length > 0 && (
          <div className="space-y-3">
            <h4 className={`text-sm font-semibold ${theme.textPrimary}`}>Upcoming Opportunities</h4>
            <div className="space-y-2">
              {networkingMetrics.upcomingNetworking.map(event => (
                <div
                  key={event.id}
                  className={`p-3 rounded-lg border ${theme.borderCard} hover:${theme.hoverCard} transition-colors cursor-pointer`}
                >
                  <h5 className={`text-sm font-medium ${theme.textPrimary} mb-1 truncate`}>
                    {event.title}
                  </h5>
                  <p className={`text-xs ${theme.textMuted}`}>
                    {new Date(event.startTime).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {goalProgress.length === 0 && (
          <div className={`p-6 text-center rounded-lg border ${theme.borderCard}`}>
            <Users className={`w-8 h-8 ${theme.textMuted} mx-auto mb-2`} />
            <p className={`text-sm ${theme.textPrimary} mb-1`}>No networking goals set</p>
            <p className={`text-xs ${theme.textMuted}`}>
              Update your career profile to set networking goals
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
