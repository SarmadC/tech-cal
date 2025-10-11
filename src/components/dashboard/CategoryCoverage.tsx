'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { Stack } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { TrackedEventRecord, Event } from '@/types';

interface CategoryCoverageProps {
  trackedEvents: TrackedEventRecord[];
  upcomingEvents: Event[];
  className?: string;
}

// Career-relevant skill categories
const SKILL_CATEGORIES = [
  'Frontend',
  'Backend',
  'Data Science',
  'AI/ML',
  'DevOps',
  'Mobile',
  'Security',
  'Cloud'
];

export function CategoryCoverage({ trackedEvents, upcomingEvents, className = '' }: CategoryCoverageProps) {
  const chartData = useMemo(() => {
    return SKILL_CATEGORIES.map(category => {
      const keywords = category.toLowerCase().split('/');
      
      // Count attended events matching this category
      const attended = trackedEvents.filter(record => {
        if (record.status !== 'attended' || !record.event) return false;
        const text = `${record.event.title || ''} ${record.event.description || ''}`.toLowerCase();
        return keywords.some(keyword => text.includes(keyword));
      }).length;

      // Count upcoming events matching this category  
      const upcoming = upcomingEvents.filter(event => {
        const text = `${event.title || ''} ${event.description || ''}`.toLowerCase();
        return keywords.some(keyword => text.includes(keyword));
      }).length;

      return {
        category,
        attended,
        upcoming,
        total: attended + upcoming
      };
    }).filter(item => item.total > 0 || SKILL_CATEGORIES.indexOf(item.category) < 5) // Show top 5 always
      .sort((a, b) => b.total - a.total);
  }, [trackedEvents, upcomingEvents]);

  const totalAttended = chartData.reduce((sum, item) => sum + item.attended, 0);
  const _totalUpcoming = chartData.reduce((sum, item) => sum + item.upcoming, 0);
  const coverageScore = chartData.filter(item => item.attended > 0).length;

  const chartConfig = {
    attended: {
      label: 'Attended',
      color: 'hsl(142, 76%, 36%)', // Green
    },
    upcoming: {
      label: 'Upcoming',
      color: 'hsl(217, 91%, 60%)', // Blue
    },
  };

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
            <Stack className="w-5 h-5 text-teal-600 dark:text-teal-400" weight="duotone" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">
              Skill Coverage
            </CardTitle>
            <CardDescription className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {coverageScore}/{SKILL_CATEGORIES.length} areas • {totalAttended} attended
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stacked Bar Chart */}
        <ChartContainer config={chartConfig}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: 30, left: 80, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
            <YAxis 
              type="category" 
              dataKey="category"
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 12, fontWeight: 500 }}
              width={70}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name, props) => {
                    const data = props.payload;
                    return [
                      <div key="content" className="space-y-1">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-xs text-gray-600 dark:text-gray-400">Attended:</span>
                          <span className="font-semibold text-green-600 dark:text-green-400">{data.attended}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-xs text-gray-600 dark:text-gray-400">Upcoming:</span>
                          <span className="font-semibold text-blue-600 dark:text-blue-400">{data.upcoming}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-xs text-gray-600 dark:text-gray-400">Total:</span>
                          <span className="font-semibold">{data.total}</span>
                        </div>
                      </div>,
                      ''
                    ];
                  }}
                />
              }
            />
            <Legend 
              wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }}
              iconType="square"
            />
            <Bar 
              dataKey="attended" 
              stackId="stack"
              fill="var(--color-attended)"
              radius={[0, 0, 0, 0]}
            />
            <Bar 
              dataKey="upcoming" 
              stackId="stack"
              fill="var(--color-upcoming)"
              radius={[0, 8, 8, 0]}
            />
          </BarChart>
        </ChartContainer>

        {/* Premium Coverage Insights */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Coverage Score</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {coverageScore}
                </span>
                <span className="text-base text-gray-400">/ {SKILL_CATEGORIES.length}</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {((coverageScore/SKILL_CATEGORIES.length)*100).toFixed(0)}% skill areas
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Top Focus</p>
              <p className="text-lg font-bold text-teal-600 dark:text-teal-400">
                {chartData[0]?.category || 'None yet'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {chartData[0]?.total || 0} total events
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

