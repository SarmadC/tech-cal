'use client';

import React, { useMemo } from 'react';
// Glass card design - no longer using shadcn Card component
import { ChartTooltip } from '@/components/ui/chart';
import { PieChart, Pie, Cell, Legend, ResponsiveContainer } from 'recharts';
import { ChartPie } from '@phosphor-icons/react';
import type { TrackedEventRecord, Event } from '@/types';

interface EventTypeDistributionProps {
  trackedEvents: TrackedEventRecord[];
  upcomingEvents: Event[];
  className?: string;
}

// Monochrome gray scale colors for glassmorphic design
const EVENT_TYPE_COLORS = [
  'rgba(140, 140, 140, 0.8)',
  'rgba(120, 120, 120, 0.7)',
  'rgba(100, 100, 100, 0.6)',
  'rgba(160, 160, 160, 0.8)',
  'rgba(130, 130, 130, 0.7)',
  'rgba(150, 150, 150, 0.6)',
  'rgba(110, 110, 110, 0.7)',
];

export function EventTypeDistribution({ trackedEvents, upcomingEvents, className = '' }: EventTypeDistributionProps) {
  const chartData = useMemo(() => {
    // Categorize events by type/format
    const eventCategories: Record<string, { attended: number; upcoming: number }> = {};

    // Process attended events
    trackedEvents
      .filter(e => e.status === 'attended' && e.event)
      .forEach(record => {
        // Infer type from title/description (simplified categorization)
        const text = `${record.event!.title || ''} ${record.event!.description || ''}`.toLowerCase();
        
        let category = 'Other';
        if (text.includes('workshop') || text.includes('hands-on')) category = 'Workshops';
        else if (text.includes('conference') || text.includes('summit')) category = 'Conferences';
        else if (text.includes('meetup') || text.includes('networking')) category = 'Meetups';
        else if (text.includes('webinar') || text.includes('online')) category = 'Webinars';
        else if (text.includes('hackathon') || text.includes('hack')) category = 'Hackathons';
        else if (text.includes('course') || text.includes('training')) category = 'Training';

        if (!eventCategories[category]) {
          eventCategories[category] = { attended: 0, upcoming: 0 };
        }
        eventCategories[category].attended++;
      });

    // Process upcoming events
    upcomingEvents.forEach(event => {
      const text = `${event.title || ''} ${event.description || ''}`.toLowerCase();
      
      let category = 'Other';
      if (text.includes('workshop') || text.includes('hands-on')) category = 'Workshops';
      else if (text.includes('conference') || text.includes('summit')) category = 'Conferences';
      else if (text.includes('meetup') || text.includes('networking')) category = 'Meetups';
      else if (text.includes('webinar') || text.includes('online')) category = 'Webinars';
      else if (text.includes('hackathon') || text.includes('hack')) category = 'Hackathons';
      else if (text.includes('course') || text.includes('training')) category = 'Training';

      if (!eventCategories[category]) {
        eventCategories[category] = { attended: 0, upcoming: 0 };
      }
      eventCategories[category].upcoming++;
    });

    // Convert to array and calculate totals
    return Object.entries(eventCategories)
      .map(([name, counts]) => ({
        name,
        attended: counts.attended,
        upcoming: counts.upcoming,
        total: counts.attended + counts.upcoming,
        percentage: 0 // Will calculate after
      }))
      .filter(item => item.total > 0)
      .sort((a, b) => b.total - a.total)
      .map((item, index) => ({
        ...item,
        color: EVENT_TYPE_COLORS[index % EVENT_TYPE_COLORS.length]
      }));
  }, [trackedEvents, upcomingEvents]);

  // Calculate percentages
  const total = chartData.reduce((sum, item) => sum + item.total, 0);
  const dataWithPercentages = chartData.map(item => ({
    ...item,
    percentage: total > 0 ? (item.total / total) * 100 : 0
  }));

  const totalAttended = chartData.reduce((sum, item) => sum + item.attended, 0);
  const diversityScore = chartData.length;

  return (
    <div className={`glass-card glass-glow p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <ChartPie className="w-5 h-5 text-glass-secondary" weight="regular" />
        <div>
          <h3 className="text-base font-medium text-glass-primary">
            Event Types
          </h3>
          <p className="text-xs text-glass-tertiary mt-0.5">
            {diversityScore} categories • {totalAttended} attended
          </p>
        </div>
      </div>
      <div>
        {/* Donut Chart */}
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dataWithPercentages}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="total"
              >
                {dataWithPercentages.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <ChartTooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload[0]) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
                      <p className="font-semibold text-gray-900 dark:text-white mb-2">
                        {data.name}
                      </p>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-gray-600 dark:text-gray-400">Total:</span>
                          <span className="font-semibold">{data.total} ({data.percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-gray-600 dark:text-gray-400">Attended:</span>
                          <span className="font-semibold text-green-600 dark:text-green-400">{data.attended}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-gray-600 dark:text-gray-400">Upcoming:</span>
                          <span className="font-semibold text-blue-600 dark:text-blue-400">{data.upcoming}</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Legend 
                verticalAlign="bottom"
                height={36}
                formatter={(value, entry) => {
                  const item = entry as { payload?: { percentage?: number } };
                  const percentage = item.payload?.percentage ?? 0;
                  return `${value} (${percentage.toFixed(0)}%)`;
                }}
                wrapperStyle={{ fontSize: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Premium Breakdown */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">
            Top Categories
          </h4>
          <div className="space-y-3">
            {dataWithPercentages.slice(0, 5).map((item, index) => (
              <div key={index} className="flex items-center gap-3 group hover:bg-gray-50 dark:hover:bg-gray-800/50 p-2 rounded-lg transition-colors">
                <div 
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: item.color }}
                />
                <div className="flex-1 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {item.name}
                  </span>
                  <div className="flex items-center gap-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-bold text-green-600 dark:text-green-400">
                        {item.attended}
                      </span>
                      <span className="text-[10px] font-medium text-gray-400">attended</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {item.upcoming}
                      </span>
                      <span className="text-[10px] font-medium text-gray-400">upcoming</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

