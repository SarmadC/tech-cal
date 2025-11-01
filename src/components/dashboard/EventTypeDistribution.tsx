'use client';

import React, { useMemo } from 'react';
// Glass card design - no longer using shadcn Card component
import { ChartTooltip } from '@/components/ui/chart';
import { PieChart, Pie, Cell, Legend, ResponsiveContainer } from 'recharts';
import { ChartPie } from '@phosphor-icons/react';
import type { TrackedEventRecord, Event } from '@/types';
import { DISTRIBUTION_CHART_CONFIG } from '@/utils/chartConfigs';

interface EventTypeDistributionProps {
  trackedEvents: TrackedEventRecord[];
  upcomingEvents: Event[];
  className?: string;
}

// Normalize database category names to chart category names
const normalizeCategoryName = (categoryName: string | null | undefined): string => {
  if (!categoryName) return 'Other';
  
  const normalized = categoryName.toLowerCase().trim();
  
  // Handle plural/singular variations and map to chart categories
  if (normalized === 'conference' || normalized === 'conferences') return 'Conferences';
  if (normalized === 'workshop' || normalized === 'workshops') return 'Workshops';
  if (normalized === 'meetup' || normalized === 'meetups') return 'Meetups';
  if (normalized === 'webinar' || normalized === 'webinars') return 'Webinars';
  if (normalized === 'hackathon' || normalized === 'hackathons') return 'Hackathons';
  if (normalized === 'training' || normalized === 'course' || normalized === 'courses') return 'Training';
  // Trade shows, expos, and similar events map to "Other" (no dedicated category in chart config)
  if (normalized === 'trade show' || normalized === 'tradeshow' || normalized === 'trade shows' || 
      normalized === 'expo' || normalized === 'exposition' || normalized === 'expositions') return 'Other';
  
  return 'Other';
};

// Map category names to chart config colors
const getCategoryColor = (categoryName: string): string => {
  const normalized = categoryName.toLowerCase();
  if (normalized === 'conferences') return DISTRIBUTION_CHART_CONFIG.conference.color;
  if (normalized === 'workshops') return DISTRIBUTION_CHART_CONFIG.workshop.color;
  if (normalized === 'meetups') return DISTRIBUTION_CHART_CONFIG.meetup.color;
  if (normalized === 'webinars') return DISTRIBUTION_CHART_CONFIG.webinar.color;
  if (normalized === 'hackathons') return DISTRIBUTION_CHART_CONFIG.hackathon.color;
  if (normalized === 'training') return DISTRIBUTION_CHART_CONFIG.workshop.color; // Use workshop color for training
  return DISTRIBUTION_CHART_CONFIG.other.color;
};

// Get event category - prioritizes database category, falls back to text matching
const getEventCategory = (event: Event | null | undefined): string => {
  if (!event) return 'Other';
  
  // First, check if event has a category from the database
  if (event.category?.name) {
    const normalized = normalizeCategoryName(event.category.name);
    if (normalized !== 'Other') {
      return normalized;
    }
  }
  
  // Fall back to text matching on title/description
  const text = `${event.title || ''} ${event.description || ''}`.toLowerCase();
  
  // Text matching for categorization (when database category is missing)
  // Note: Trade shows/expos are not included here - they should come from database category
  if (text.includes('workshop') || text.includes('hands-on')) return 'Workshops';
  if (text.includes('conference') || text.includes('summit')) return 'Conferences';
  if (text.includes('meetup') || text.includes('networking')) return 'Meetups';
  if (text.includes('webinar') || text.includes('online')) return 'Webinars';
  if (text.includes('hackathon') || text.includes('hack')) return 'Hackathons';
  if (text.includes('course') || text.includes('training')) return 'Training';
  
  return 'Other';
};

export function EventTypeDistribution({ trackedEvents, upcomingEvents, className = '' }: EventTypeDistributionProps) {
  const chartData = useMemo(() => {
    // Categorize events by type/format, tracking event names
    const eventCategories: Record<string, { 
      attended: number; 
      upcoming: number;
      attendedEventNames: string[];
      upcomingEventNames: string[];
    }> = {};

    // Process attended events
    trackedEvents
      .filter(e => e.status === 'attended' && e.event)
      .forEach(record => {
        const category = getEventCategory(record.event);
        const eventTitle = record.event!.title || 'Untitled Event';

        if (!eventCategories[category]) {
          eventCategories[category] = { 
            attended: 0, 
            upcoming: 0,
            attendedEventNames: [],
            upcomingEventNames: []
          };
        }
        eventCategories[category].attended++;
        eventCategories[category].attendedEventNames.push(eventTitle);
      });

    // Process upcoming events
    upcomingEvents.forEach(event => {
      const category = getEventCategory(event);
      const eventTitle = event.title || 'Untitled Event';

      if (!eventCategories[category]) {
        eventCategories[category] = { 
          attended: 0, 
          upcoming: 0,
          attendedEventNames: [],
          upcomingEventNames: []
        };
      }
      eventCategories[category].upcoming++;
      eventCategories[category].upcomingEventNames.push(eventTitle);
    });

    // Convert to array and calculate totals
    return Object.entries(eventCategories)
      .map(([name, data]) => ({
        name,
        attended: data.attended,
        upcoming: data.upcoming,
        total: data.attended + data.upcoming,
        percentage: 0, // Will calculate after
        color: getCategoryColor(name),
        attendedEventNames: data.attendedEventNames,
        upcomingEventNames: data.upcomingEventNames,
        allEventNames: [...data.attendedEventNames, ...data.upcomingEventNames]
      }))
      .filter(item => item.total > 0)
      .sort((a, b) => b.total - a.total);
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
                  const data = payload[0].payload as {
                    allEventNames?: string[];
                    [key: string]: unknown;
                  };
                  
                  // Combine all event names, removing duplicates
                  const allEventNames: string[] = [...new Set((data.allEventNames || []) as string[])];
                  
                  if (allEventNames.length === 0) return null;
                  
                  return (
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg max-w-[300px]">
                      <div className="max-h-[200px] overflow-y-auto space-y-1">
                        {allEventNames.map((eventName: string, index: number) => (
                          <div 
                            key={index}
                            className="text-sm text-gray-900 dark:text-white py-1 px-2 rounded bg-gray-50 dark:bg-gray-700/50 truncate"
                            title={eventName}
                          >
                            {eventName}
                          </div>
                        ))}
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

