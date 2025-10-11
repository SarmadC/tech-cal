'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { XAxis, YAxis, Area, AreaChart, ReferenceLine } from 'recharts';
import { TrendUp, TrendDown, Minus, Calendar } from '@phosphor-icons/react';
import { format, subDays, startOfDay } from 'date-fns';
import { ACTIVITY_CHART_CONFIG } from '@/utils/chartConfigs';
import { cn } from '@/lib/utils';
import type { TrackedEventRecord } from '@/types';

interface ActivityTrendCardProps {
  trackedEvents: TrackedEventRecord[];
  className?: string;
}

export function ActivityTrendCard({ trackedEvents, className = '' }: ActivityTrendCardProps) {
  // Generate enhanced data for the last 30 days
  const generateTrendData = () => {
    const data = [];
    const today = startOfDay(new Date());
    let cumulativeTotal = 0;

    for (let i = 29; i >= 0; i--) {
      const date = subDays(today, i);
      const dayStart = date.getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;

      // Count events tracked on this day
      const eventsOnDay = trackedEvents.filter(event => {
        const trackedDate = new Date(event.trackedAt).getTime();
        return trackedDate >= dayStart && trackedDate < dayEnd;
      }).length;

      cumulativeTotal += eventsOnDay;

      data.push({
        date: format(date, 'MMM d'),
        shortDate: format(date, 'M/d'),
        events: eventsOnDay,
        cumulative: cumulativeTotal,
        isToday: format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
      });
    }

    return data;
  };

  const data = generateTrendData();
  const totalThisWeek = data.slice(-7).reduce((sum, day) => sum + day.events, 0);
  const totalLastWeek = data.slice(-14, -7).reduce((sum, day) => sum + day.events, 0);
  const totalEvents = data.reduce((sum, day) => sum + day.events, 0);
  const maxDaily = Math.max(...data.map(d => d.events));
  const avgDaily = totalEvents / 30;

  const weeklyChange = totalLastWeek > 0
    ? Math.round(((totalThisWeek - totalLastWeek) / totalLastWeek) * 100)
    : totalThisWeek > 0 ? 100 : 0;

  const getTrendIcon = () => {
    if (weeklyChange > 0) return TrendUp;
    if (weeklyChange < 0) return TrendDown;
    return Minus;
  };

  const getTrendColor = () => {
    if (weeklyChange > 0) return 'text-green-600';
    if (weeklyChange < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const TrendIcon = getTrendIcon();

  // Handle empty state
  if (totalEvents === 0) {
    return (
      <Card className={cn(className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">Activity Trend</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">Events tracked over the last 30 days</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px]">
          <div className="text-center">
            <Calendar className="w-8 h-8 mx-auto mb-3 opacity-50 text-gray-400" />
            <h3 className="font-medium mb-1 text-gray-900 dark:text-white">No tracking activity yet</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Start tracking events to see your activity trend here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="space-y-1">
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">Activity Trend</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            {totalEvents} event{totalEvents !== 1 ? 's' : ''} tracked •
            {avgDaily > 0 ? ` ${avgDaily.toFixed(1)} avg/day` : ' Getting started'}
          </CardDescription>
        </div>
        <div className="flex items-center space-x-1 text-sm">
          <TrendIcon className={`w-4 h-4 ${getTrendColor()}`} />
          <span className={`font-medium ${getTrendColor()}`}>
            {weeklyChange > 0 ? '+' : ''}{weeklyChange}%
          </span>
          <span className="text-gray-600 dark:text-gray-400">vs last week</span>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={ACTIVITY_CHART_CONFIG}>
          <AreaChart
            accessibilityLayer
            data={data}
            margin={{
              left: 12,
              right: 12,
              top: 12,
              bottom: 12,
            }}
          >
            <defs>
              <linearGradient id="fillEvents" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-events)" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="var(--color-events)" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <XAxis
              dataKey="shortDate"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              interval={Math.floor(data.length / 6)}
            />
            <YAxis hide />
            <ChartTooltip
              cursor={{ stroke: 'var(--color-events)', strokeWidth: 1, strokeDasharray: '4 4' }}
              content={<ChartTooltipContent
                nameKey="events"
                labelFormatter={(value) => `${value}`}
                formatter={(value, name) => [
                  value,
                  name === "events" ? "Events tracked" : "Total tracked"
                ]}
              />}
            />
            <Area
              dataKey="events"
              type="monotone"
              fill="url(#fillEvents)"
              fillOpacity={0.6}
              stroke="var(--color-events)"
              strokeWidth={2}
            />
            {maxDaily > 0 && (
              <ReferenceLine
                y={avgDaily}
                stroke="var(--color-cumulative)"
                strokeDasharray="3 3"
                strokeOpacity={0.7}
              />
            )}
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}