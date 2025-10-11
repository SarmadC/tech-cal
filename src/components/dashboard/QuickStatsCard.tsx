import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendUp, TrendDown, Target, Calendar, Clock, ArrowUpRight } from '@phosphor-icons/react';
import { format, isThisMonth, addDays } from 'date-fns';
import { useTimelineTheme } from '@/hooks/useTimelineTheme';
import { cn } from '@/lib/utils';
import type { Event, TrackedEventRecord } from '@/types';

interface QuickStatsCardProps {
  events: Event[];
  trackedEvents: TrackedEventRecord[];
  className?: string;
}

export function QuickStatsCard({ events, trackedEvents, className = '' }: QuickStatsCardProps) {
  const _theme = useTimelineTheme();
  const now = new Date();

  // Calculate various time-based metrics
  const upcomingEvents = events.filter(event => {
    const eventDate = new Date(event.startTime);
    return eventDate >= now;
  });

  const thisWeekEvents = upcomingEvents.filter(event => {
    const eventDate = new Date(event.startTime);
    const weekFromNow = addDays(now, 7);
    return eventDate <= weekFromNow;
  });

  const thisMonthEvents = upcomingEvents.filter(event => {
    const eventDate = new Date(event.startTime);
    return isThisMonth(eventDate);
  });

  const recentlyTracked = trackedEvents.filter(event => {
    const trackedDate = new Date(event.trackedAt);
    const weekAgo = addDays(now, -7);
    return trackedDate >= weekAgo;
  });

  // Calculate engagement rate properly (tracked vs available events)
  const availableEvents = events.length;
  const trackedCount = trackedEvents.length;
  const engagementRate = availableEvents > 0
    ? Math.min(Math.round((trackedCount / availableEvents) * 100), 100)
    : 0;

  const stats = [
    {
      title: 'Events Tracked',
      value: trackedCount,
      subtitle: `${recentlyTracked.length} this week`,
      icon: Target,
      description: 'Total events you\'re following',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-50 dark:bg-emerald-900/20',
      progress: Math.min((trackedCount / 50) * 100, 100),
      trend: recentlyTracked.length > 0 ? 'up' : 'neutral',
      trendValue: recentlyTracked.length
    },
    {
      title: 'This Week',
      value: thisWeekEvents.length,
      subtitle: thisWeekEvents.length > 0 ? format(new Date(thisWeekEvents[0]?.startTime), 'MMM d') : 'None scheduled',
      icon: Calendar,
      description: 'Events in the next 7 days',
      iconColor: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-50 dark:bg-blue-900/20',
      progress: Math.min((thisWeekEvents.length / 10) * 100, 100),
      trend: thisWeekEvents.length > thisMonthEvents.length / 4 ? 'up' : 'neutral',
      trendValue: thisWeekEvents.length
    },
    {
      title: 'This Month',
      value: thisMonthEvents.length,
      subtitle: `${engagementRate}% tracked`,
      icon: Clock,
      description: 'Events available this month',
      iconColor: 'text-purple-600 dark:text-purple-400',
      iconBg: 'bg-purple-50 dark:bg-purple-900/20',
      progress: engagementRate,
      trend: engagementRate > 50 ? 'up' : 'neutral',
      trendValue: engagementRate
    }
  ];

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">Dashboard Overview</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">Your event tracking activity</CardDescription>
          </div>
          <ArrowUpRight className="w-5 h-5 text-gray-400" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            const trendIcon = stat.trend === 'up' ? (
              <TrendUp className="w-4 h-4 text-green-600 dark:text-green-400" />
            ) : stat.trend === 'down' ? (
              <TrendDown className="w-4 h-4 text-red-600 dark:text-red-400" />
            ) : null;

            return (
              <div key={index} className="relative p-5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={cn("p-2.5 rounded-lg", stat.iconBg)}>
                      <Icon className={cn("w-5 h-5", stat.iconColor)} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {stat.title}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {stat.subtitle}
                      </p>
                    </div>
                  </div>
                  {trendIcon && (
                    <div className="flex items-center space-x-1">
                      {trendIcon}
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        {stat.trendValue}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">
                      {stat.value}
                    </span>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {Math.round(stat.progress)}%
                    </span>
                  </div>
                  <div className="space-y-2">
                    <Progress
                      value={stat.progress}
                      className="h-2 bg-gray-200 dark:bg-gray-700"
                    />
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {stat.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}