'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { Target, TrendUp } from '@phosphor-icons/react';
import type { CareerProfile, TrackedEventRecord, Event, CareerGoal } from '@/types';
import { cn } from '@/lib/utils';
import { getMatchingGoals, getGoalTarget } from '@/utils/eventGoalAlignment';

interface CareerGoalProgressChartProps {
  careerProfile: CareerProfile;
  trackedEvents: TrackedEventRecord[];
  upcomingEvents: Event[];
  className?: string;
}

const GOAL_LABELS: Partial<Record<CareerGoal, string>> = {
  'skill-development': 'Skill Development',
  'role-transition': 'Role Transition',
  'leadership-growth': 'Leadership Growth',
  'networking': 'Networking'
};

export function CareerGoalProgressChart({
  careerProfile,
  trackedEvents,
  upcomingEvents,
  className
}: CareerGoalProgressChartProps) {
  const chartData = useMemo(() => {
    // Only process active career goals
    const activeGoals = careerProfile.careerGoals;
    
    if (activeGoals.length === 0) {
      return [];
    }

    return activeGoals.reduce<Array<{
      goal: string;
      attended: number;
      available: number;
      target: number;
      progress: number;
      shortGoal: string;
    }>>((acc, goal) => {
      const attendedCount = trackedEvents.filter(record => {
        if (record.status !== 'attended' || !record.event) return false;
        return getMatchingGoals(record.event, [goal]).includes(goal);
      }).length;

      const availableCount = upcomingEvents.filter(event => {
        return getMatchingGoals(event, [goal]).includes(goal);
      }).length;

      const target = getGoalTarget(goal);
      const progress = target > 0 ? Math.min(Math.round((attendedCount / target) * 100), 100) : 0;
      const label = GOAL_LABELS[goal] || goal.replace('-', ' ');

      acc.push({
        goal: label,
        attended: attendedCount,
        available: availableCount,
        target,
        progress,
        shortGoal: label.split(' ')[0] || label
      });

      return acc;
    }, []);
  }, [careerProfile, trackedEvents, upcomingEvents]);

  const totalAttended = chartData.reduce((sum, item) => sum + item.attended, 0);
  const totalAvailable = chartData.reduce((sum, item) => sum + item.available, 0);
  const averageProgress = chartData.length > 0 
    ? Math.round(chartData.reduce((sum, item) => sum + item.progress, 0) / chartData.length)
    : 0;

  if (chartData.length === 0) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
            Career Goal Progress
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Set career goals in your profile to track progress
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <div className="text-center">
            <Target className="w-8 h-8 mx-auto mb-3 text-gray-400" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Complete your career profile to see goal-aligned event recommendations
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartConfig = {
    attended: {
      label: 'Events Attended',
      color: 'hsl(var(--chart-1))',
    },
    available: {
      label: 'Available Events',
      color: 'hsl(var(--chart-2))',
    },
  };

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              Career Goal Progress
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Event attendance by career goal • {totalAttended} attended • {totalAvailable} available
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <TrendUp className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-sm font-semibold text-green-700 dark:text-green-400">
              {averageProgress}% avg
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            barGap={8}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              vertical={false}
              stroke="hsl(var(--border))"
              opacity={0.3}
            />
            <XAxis
              dataKey="goal"
              tickLine={false}
              axisLine={false}
              tick={{ 
                fill: 'hsl(var(--muted-foreground))', 
                fontSize: 12,
              }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ 
                fill: 'hsl(var(--muted-foreground))', 
                fontSize: 12 
              }}
              label={{ 
                value: 'Events', 
                angle: -90, 
                position: 'insideLeft',
                style: { 
                  fill: 'hsl(var(--muted-foreground))',
                  fontSize: 12
                }
              }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name, item) => {
                    const data = item.payload;
                    if (name === 'attended') {
                      return [
                        <div key="attended" className="flex flex-col gap-1">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-xs text-gray-600 dark:text-gray-400">Attended:</span>
                            <span className="font-semibold">{value}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-xs text-gray-600 dark:text-gray-400">Target:</span>
                            <span className="font-semibold">{data.target}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-xs text-gray-600 dark:text-gray-400">Progress:</span>
                            <span className="font-semibold text-green-600 dark:text-green-400">{data.progress}%</span>
                          </div>
                        </div>,
                        ''
                      ];
                    }
                    if (name === 'available') {
                      return [`${value} upcoming`, ''];
                    }
                    return [value, name];
                  }}
                />
              }
            />
            <Legend 
              wrapperStyle={{ 
                paddingTop: '20px',
                fontSize: '12px'
              }}
              iconType="square"
            />
            <Bar
              dataKey="attended"
              fill="var(--color-attended)"
              radius={[8, 8, 0, 0]}
              maxBarSize={60}
            />
            <Bar
              dataKey="available"
              fill="var(--color-available)"
              radius={[8, 8, 0, 0]}
              maxBarSize={60}
            />
          </BarChart>
        </ChartContainer>

        {/* Goal Insights */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Goal Insights
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {chartData.map((item, index) => (
              <div 
                key={index}
                className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {item.goal}
                  </span>
                  <span className={cn(
                    "text-xs font-semibold px-2 py-0.5 rounded",
                    item.progress >= 75 
                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                      : item.progress >= 50
                      ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  )}>
                    {item.progress}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                  <span>{item.attended} / {item.target} attended</span>
                  <span className="text-blue-600 dark:text-blue-400">
                    {item.available} available
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
