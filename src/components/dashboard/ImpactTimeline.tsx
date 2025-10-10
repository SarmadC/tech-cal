'use client';

import React, { useMemo } from 'react';
// Glass card design - no longer using shadcn Card component
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Area, XAxis, YAxis, CartesianGrid, Line, ComposedChart } from 'recharts';
import { TrendUp } from '@phosphor-icons/react';
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';
import type { TrackedEventRecord } from '@/types';

interface ImpactTimelineProps {
  trackedEvents: TrackedEventRecord[];
  className?: string;
}

export function ImpactTimeline({ trackedEvents, className = '' }: ImpactTimelineProps) {
  const chartData = useMemo(() => {
    const now = new Date();
    const ninetyDaysAgo = subDays(now, 90);

    // Generate all days in the range
    const days = eachDayOfInterval({ start: ninetyDaysAgo, end: now });

    // Count events per day
    const dailyCounts = days.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const eventsOnDay = trackedEvents.filter(event => {
        if (event.status !== 'attended') return false;
        const eventDate = new Date(event.trackedAt);
        return eventDate >= dayStart && eventDate <= dayEnd;
      }).length;

      return {
        date: format(day, 'MMM d'),
        fullDate: format(day, 'yyyy-MM-dd'),
        events: eventsOnDay,
        impact: eventsOnDay * 7.5, // Normalized impact score
        rollingAvg: 0 // Will calculate next
      };
    });

    // Calculate 7-day rolling average
    for (let i = 0; i < dailyCounts.length; i++) {
      const start = Math.max(0, i - 6);
      const windowData = dailyCounts.slice(start, i + 1);
      const avg = windowData.reduce((sum, d) => sum + d.events, 0) / windowData.length;
      dailyCounts[i].rollingAvg = avg;
    }

    return dailyCounts;
  }, [trackedEvents]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const totalEvents = chartData.reduce((sum, d) => sum + d.events, 0);
    const avgPerDay = totalEvents / chartData.length;
    const last7Days = chartData.slice(-7).reduce((sum, d) => sum + d.events, 0);
    const prev7Days = chartData.slice(-14, -7).reduce((sum, d) => sum + d.events, 0);
    const weekOverWeek = prev7Days > 0 ? ((last7Days - prev7Days) / prev7Days) * 100 : 0;

    // Distribution stats
    const max = Math.max(...chartData.map(d => d.events));
    const variance = chartData.filter(d => d.events > 0).length;

    return {
      totalEvents,
      avgPerDay: avgPerDay.toFixed(2),
      weekOverWeek: weekOverWeek.toFixed(1),
      maxDay: max,
      activeDays: variance
    };
  }, [chartData]);

  const chartConfig = {
    events: {
      label: 'Events',
      color: 'rgba(128, 128, 128, 0.6)', // Monochrome gray
    },
    rollingAvg: {
      label: '7-day Average',
      color: 'rgba(100, 100, 100, 0.8)', // Darker gray
    },
  };

  // Check for empty state
  const hasData = stats.totalEvents > 0;

  return (
    <div className={`glass-card glass-glow p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <TrendUp className="w-5 h-5 text-glass-secondary" weight="regular" />
            <h3 className="text-base font-medium text-glass-primary">
              Activity & Impact Trends
            </h3>
          </div>
          <p className="text-xs text-glass-tertiary">
            {stats.totalEvents} events attended • {stats.avgPerDay} daily average
          </p>
        </div>
        {hasData && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5">
            <span className="text-xs font-medium text-glass-secondary">
              {parseFloat(stats.weekOverWeek) > 0 ? '+' : ''}{stats.weekOverWeek}%
            </span>
            <span className="text-xs text-glass-tertiary">WoW</span>
          </div>
        )}
      </div>
      <div>
        {/* Main Chart */}
        <ChartContainer config={chartConfig} className="h-[220px] w-full">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="fillEvents" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-events)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-events)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="hsl(var(--border))"
              opacity={0.3}
            />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 500 }}
              interval={Math.floor(chartData.length / 6)}
              dy={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 500 }}
              label={{
                value: 'Events per day',
                angle: -90,
                position: 'insideLeft',
                style: { 
                  fill: 'hsl(var(--muted-foreground))', 
                  fontSize: 11,
                  fontWeight: 600
                }
              }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => {
                    if (name === 'rollingAvg') {
                      return [`${Number(value).toFixed(2)} events`, '7-day avg'];
                    }
                    return [`${value} events`, 'Daily'];
                  }}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="events"
              stroke="var(--color-events)"
              strokeWidth={2}
              fill="url(#fillEvents)"
              fillOpacity={1}
            />
            <Line
              type="monotone"
              dataKey="rollingAvg"
              stroke="var(--color-rollingAvg)"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          </ComposedChart>
        </ChartContainer>

        {/* Premium Distribution Insights */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">
            90-Day Summary
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="group">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Total Attended</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalEvents}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stats.avgPerDay}/day avg</p>
            </div>
            <div className="group">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Peak Activity</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.maxDay}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">events in one day</p>
            </div>
            <div className="group">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Active Days</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeDays}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{((stats.activeDays/90)*100).toFixed(0)}% of period</p>
            </div>
            <div className="group">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Weekly Trend</p>
              <div className="flex items-baseline gap-1">
                <p className={`text-2xl font-bold ${
                  parseFloat(stats.weekOverWeek) >= 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {parseFloat(stats.weekOverWeek) > 0 ? '+' : ''}{stats.weekOverWeek}%
                </p>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">vs last week</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

