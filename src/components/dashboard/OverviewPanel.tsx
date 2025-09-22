import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from './MetricCard';
import { MiniChart, MiniBarChart } from './MiniChart';
import { ProgressBar } from './ProgressBar';
import { CalendarIcon, StarIcon, MedalIcon, MonitorIcon } from '@phosphor-icons/react';
import { useEventMetrics } from '@/hooks/useEventMetrics';
import type { Event, TrackedEventRecord } from '@/types';

interface OverviewPanelProps {
  allEvents: Event[];
  trackedEvents: TrackedEventRecord[];
  className?: string;
}

/**
 * Consolidated overview panel with key metrics and insights
 */
export function OverviewPanel({ allEvents, trackedEvents, className = '' }: OverviewPanelProps) {
  const metrics = useEventMetrics(allEvents, trackedEvents);
  
  // Get top categories with data for charts
  const topCategories = Object.entries(metrics.categories)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([category, count]) => ({ label: category, value: count }));

  // Generate sample trend data (in real app, this would come from historical data)
  const generateTrendData = (current: number) => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const variation = Math.random() * 0.4 - 0.2; // ±20% variation
      data.push(Math.max(0, Math.round(current * (1 + variation))));
    }
    return data;
  };

  // const trackingProgress = metrics.total > 0 ? (metrics.tracked / metrics.total) * 100 : 0; // Unused variable removed

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Events"
          value={metrics.total}
          icon={CalendarIcon}
          iconColor="text-blue-600 dark:text-blue-400"
          iconBgColor="bg-blue-100 dark:bg-blue-900/30"
          description="Available events"
        />
        
        <MetricCard
          title="Tracked Events"
          value={metrics.tracked}
          icon={StarIcon}
          iconColor="text-green-600 dark:text-green-400"
          iconBgColor="bg-green-100 dark:bg-green-900/30"
          description="Your personal list"
          progress={{
            value: metrics.tracked,
            max: metrics.total,
            label: 'Tracking Progress'
          }}
        />
        
        <MetricCard
          title="This Month"
          value={metrics.thisMonth}
          icon={MedalIcon}
          iconColor="text-purple-600 dark:text-purple-400"
          iconBgColor="bg-purple-100 dark:bg-purple-900/30"
          trend={metrics.monthlyTrend !== 0 ? {
            value: Math.abs(metrics.monthlyTrend),
            direction: metrics.monthlyTrend > 0 ? 'up' : 'down'
          } : undefined}
          description="Events this month"
        />
        
        <MetricCard
          title="Virtual Events"
          value={metrics.virtual}
          icon={MonitorIcon}
          iconColor="text-orange-600 dark:text-orange-400"
          iconBgColor="bg-orange-100 dark:bg-orange-900/30"
          description="Online events"
        />
      </div>

      {/* Quick Insights with Visual Elements */}
      <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
            Quick Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <ProgressBar
                  value={metrics.tracked}
                  max={metrics.total}
                  label="Activity Progress"
                  color="bg-blue-500"
                  bgColor="bg-blue-200 dark:bg-blue-800/30"
                  className="mb-2"
                />
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Tracking {metrics.tracked} of {metrics.total} available events
                </p>
              </div>
              
              {topCategories.length > 0 && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-3">
                    Top Categories
                  </p>
                  <MiniBarChart 
                    data={topCategories.map((cat, index) => ({
                      ...cat,
                      color: ['#10b981', '#3b82f6', '#8b5cf6'][index]
                    }))}
                    height={30}
                  />
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <ProgressBar
                  value={metrics.virtual}
                  max={metrics.total}
                  label="Virtual Events"
                  color="bg-purple-500"
                  bgColor="bg-purple-200 dark:bg-purple-800/30"
                  className="mb-2"
                />
                <p className="text-sm text-purple-800 dark:text-purple-200">
                  {metrics.virtual} online events available
                </p>
              </div>
              
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                    Monthly Trend
                  </p>
                  {metrics.monthlyTrend !== 0 && (
                    <span className={`text-xs ${metrics.monthlyTrend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {metrics.monthlyTrend > 0 ? '+' : ''}{metrics.monthlyTrend}%
                    </span>
                  )}
                </div>
                <MiniChart 
                  data={generateTrendData(metrics.thisMonth)}
                  height={30}
                  color="text-orange-500"
                />
                <p className="text-sm text-orange-800 dark:text-orange-200 mt-2">
                  {metrics.thisMonth} events this month
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
