'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { ChartPie, TrendUp } from '@phosphor-icons/react';
import type { Event } from '@/types';

interface EventDistributionCardProps {
  events: Event[];
  className?: string;
}

const chartConfig = {
  conference: {
    label: "Conferences",
    color: "hsl(var(--chart-1))",
  },
  workshop: {
    label: "Workshops",
    color: "hsl(var(--chart-2))",
  },
  meetup: {
    label: "Meetups",
    color: "hsl(var(--chart-3))",
  },
  webinar: {
    label: "Webinars",
    color: "hsl(var(--chart-4))",
  },
  networking: {
    label: "Networking",
    color: "hsl(var(--chart-5))",
  },
  hackathon: {
    label: "Hackathons",
    color: "hsl(287 69% 50%)",
  },
  bootcamp: {
    label: "Bootcamps",
    color: "hsl(200 95% 50%)",
  },
  summit: {
    label: "Summits",
    color: "hsl(25 95% 53%)",
  },
  other: {
    label: "Other",
    color: "hsl(var(--muted-foreground))",
  },
} satisfies ChartConfig;

export function EventDistributionCard({ events, className = '' }: EventDistributionCardProps) {
  const categorizeEvent = (event: Event): string => {
    // Try multiple approaches to categorize the event
    const title = event.title.toLowerCase();
    const description = event.description.toLowerCase();
    const organizer = event.organizer.toLowerCase();

    // Use event category if available
    const categoryName = event.category?.name?.toLowerCase();
    if (categoryName) {
      const knownTypes = ['conference', 'workshop', 'meetup', 'webinar', 'networking', 'hackathon', 'bootcamp', 'summit'];
      if (knownTypes.includes(categoryName)) return categoryName;
    }

    // Pattern matching based on title and description
    if (title.includes('conference') || title.includes('conf ') || title.includes('con ')) return 'conference';
    if (title.includes('workshop') || title.includes('hands-on') || title.includes('tutorial')) return 'workshop';
    if (title.includes('meetup') || title.includes('meet-up') || organizer.includes('meetup')) return 'meetup';
    if (title.includes('webinar') || title.includes('online') || title.includes('virtual')) return 'webinar';
    if (title.includes('networking') || title.includes('network') || title.includes('mixer')) return 'networking';
    if (title.includes('hackathon') || title.includes('hack ') || title.includes('buildathon')) return 'hackathon';
    if (title.includes('bootcamp') || title.includes('intensive') || title.includes('training')) return 'bootcamp';
    if (title.includes('summit') || title.includes('expo') || title.includes('convention')) return 'summit';

    // Description patterns
    if (description.includes('workshop') || description.includes('hands-on')) return 'workshop';
    if (description.includes('networking') || description.includes('meet other')) return 'networking';
    if (description.includes('hackathon') || description.includes('build a project')) return 'hackathon';

    return 'other';
  };

  const generateDistributionData = () => {
    const typeCount: { [key: string]: number } = {};

    events.forEach(event => {
      const type = categorizeEvent(event);
      typeCount[type] = (typeCount[type] || 0) + 1;
    });

    return Object.entries(typeCount)
      .map(([type, count]) => ({
        type,
        count,
        percentage: Math.round((count / events.length) * 100),
        fill: `var(--color-${type})`,
      }))
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count);
  };

  const data = generateDistributionData();
  const totalEvents = data.reduce((sum, item) => sum + item.count, 0);
  const topType = data[0];
  const hasVariety = data.length > 1;
  const shouldUseBarChart = data.length > 4 || (data.length === 1 && data[0].type !== 'other');

  // Empty state
  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-lg">Event Types</CardTitle>
            <CardDescription>Breakdown by category</CardDescription>
          </div>
          <ChartPie className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px]">
          <div className="text-center text-muted-foreground">
            <ChartPie className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <h3 className="font-medium text-foreground mb-1">No events to analyze</h3>
            <p className="text-sm">Event categories will appear here once you have events</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Single category state
  if (data.length === 1) {
    const singleType = data[0];
    const config = chartConfig[singleType.type as keyof typeof chartConfig] || chartConfig.other;

    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-lg">Event Types</CardTitle>
            <CardDescription>{totalEvents} {config.label.toLowerCase()}</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: config.color }}
            />
            <span className="text-sm font-medium text-muted-foreground">100%</span>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[160px]">
          <div className="text-center">
            <div
              className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center"
              style={{ backgroundColor: `${config.color}20`, color: config.color }}
            >
              <ChartPie className="w-8 h-8" />
            </div>
            <h3 className="font-semibold text-lg text-foreground">{config.label}</h3>
            <p className="text-sm text-muted-foreground">
              All events are {config.label.toLowerCase()}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Multi-category visualization
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="space-y-1">
          <CardTitle className="text-lg">Event Types</CardTitle>
          <CardDescription>
            {totalEvents} events • {topType && `${topType.percentage}% ${chartConfig[topType.type as keyof typeof chartConfig]?.label || 'Other'}`}
          </CardDescription>
        </div>
        <div className="flex items-center space-x-1 text-sm">
          {hasVariety && (
            <>
              <TrendUp className="w-3 h-3 text-blue-600" />
              <span className="text-muted-foreground">Diverse</span>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {shouldUseBarChart ? (
          <ChartContainer config={chartConfig} className="h-[160px] w-full">
            <BarChart data={data} layout="horizontal" margin={{ left: 60, right: 12 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="type"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => chartConfig[value as keyof typeof chartConfig]?.label || 'Other'}
                width={55}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent
                  formatter={(value, name) => [
                    `${value} events (${data.find(d => d.type === name)?.percentage}%)`,
                    chartConfig[name as keyof typeof chartConfig]?.label || 'Other'
                  ]}
                />}
              />
              <Bar
                dataKey="count"
                radius={[0, 2, 2, 0]}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square max-h-[180px]"
          >
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent
                  formatter={(value, name) => [
                    `${value} events`,
                    chartConfig[name as keyof typeof chartConfig]?.label || 'Other'
                  ]}
                />}
              />
              <Pie
                data={data}
                dataKey="count"
                nameKey="type"
                innerRadius={35}
                strokeWidth={1}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <ChartLegend
                content={<ChartLegendContent nameKey="type" />}
                className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/3 [&>*]:justify-center"
              />
            </PieChart>
          </ChartContainer>
        )}

        {/* Summary Stats */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-3 pt-3 border-t">
          <span>Most common: {topType && chartConfig[topType.type as keyof typeof chartConfig]?.label}</span>
          <span>{data.length} categories</span>
        </div>
      </CardContent>
    </Card>
  );
}