'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, BarChart, Bar, CartesianGrid, LabelList, XAxis } from 'recharts';
import { ChartPie, TrendUp } from '@phosphor-icons/react';
import { DISTRIBUTION_CHART_CONFIG } from '@/utils/chartConfigs';
import type { Event } from '@/types';

interface EventDistributionCardProps {
    events: Event[];
    className?: string;
}


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
    const topType = data[0];
    const hasVariety = data.length > 1;
    const shouldUseBarChart = data.length > 4 || (data.length === 1 && data[0].type !== 'other');

    // Empty state
    if (data.length === 0) {
        return (
            <Card className={className}>
                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                    <div className="space-y-1">
                        <CardTitle className="text-sm font-semibold text-foreground-primary">Event Types</CardTitle>
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
        const config = DISTRIBUTION_CHART_CONFIG[singleType.type as keyof typeof DISTRIBUTION_CHART_CONFIG] || DISTRIBUTION_CHART_CONFIG.other;

        return (
            <Card className={className}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="space-y-1">
                        <CardTitle className="text-sm font-semibold text-foreground-primary">Event Types</CardTitle>
                        <CardDescription>{config.label}</CardDescription>
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
                    <CardTitle className="text-sm font-semibold text-foreground-primary">Event Types</CardTitle>
                    <CardDescription>Breakdown by category</CardDescription>
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
                    <ChartContainer config={DISTRIBUTION_CHART_CONFIG} className="h-[190px] w-full">
                        <BarChart
                            data={data}
                            margin={{ top: 18, right: 8, left: 8, bottom: 28 }}
                            barCategoryGap="20%"
                        >
                            <CartesianGrid
                                stroke="hsl(var(--border) / 0.4)"
                                vertical={false}
                            />
                            <XAxis
                                dataKey="type"
                                axisLine={false}
                                tickLine={false}
                                interval={0}
                                height={40}
                                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                                tickFormatter={(value) =>
                                    DISTRIBUTION_CHART_CONFIG[
                                        value as keyof typeof DISTRIBUTION_CHART_CONFIG
                                    ]?.label || 'Other'
                                }
                            />
                            <ChartTooltip
                                cursor={false}
                                content={
                                    <ChartTooltipContent
                                        formatter={(value, _name, item) => {
                                            const type = String(item.payload?.type || 'other');
                                            const label =
                                                DISTRIBUTION_CHART_CONFIG[
                                                    type as keyof typeof DISTRIBUTION_CHART_CONFIG
                                                ]?.label || 'Other';
                                            const count = typeof value === 'number' ? value : Number(value) || 0;
                                            return `${label}: ${count} events`;
                                        }}
                                    />
                                }
                            />
                            <Bar
                                dataKey="count"
                                radius={[6, 6, 0, 0]}
                                maxBarSize={52}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                                <LabelList
                                    dataKey="count"
                                    position="top"
                                    fill="hsl(var(--foreground))"
                                    fontSize={11}
                                />
                            </Bar>
                        </BarChart>
                    </ChartContainer>
                ) : (
                    <ChartContainer
                        config={DISTRIBUTION_CHART_CONFIG}
                        className="mx-auto aspect-square max-h-[180px]"
                    >
                        <PieChart>
                            <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent
                                    formatter={(value, name) => [
                                        `${value} events`,
                                        DISTRIBUTION_CHART_CONFIG[name as keyof typeof DISTRIBUTION_CHART_CONFIG]?.label || 'Other'
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
                    <span>Most common: {topType && DISTRIBUTION_CHART_CONFIG[topType.type as keyof typeof DISTRIBUTION_CHART_CONFIG]?.label}</span>
                    <span>{data.length} categories</span>
                </div>
            </CardContent>
        </Card>
    );
}
