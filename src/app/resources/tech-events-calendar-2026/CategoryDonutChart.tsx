'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { categoryNameToSlug } from '@/utils/categorySlugUtils';

interface CategoryDonutChartProps {
    categories: {
        id: string;
        name: string;
        eventCount?: number;
    }[];
}

interface CategoryDatum {
    id: string;
    name: string;
    eventCount: number;
    percent: number;
}

const COLORS = [
    '#3b82f6',
    '#8b5cf6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#06b6d4',
    '#ec4899',
];

const CUSTOM_TOOLTIP_STYLE = {
    backgroundColor: 'rgba(24, 24, 27, 0.92)',
    borderColor: 'rgba(63, 63, 70, 0.55)',
    backdropFilter: 'blur(8px)',
    color: '#fafafa',
    borderRadius: '8px',
    padding: '8px 12px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
};

export function CategoryDonutChart({ categories }: CategoryDonutChartProps) {
    const router = useRouter();

    const data = useMemo<CategoryDatum[]>(() => {
        const normalized = categories
            .map((category) => ({
                ...category,
                eventCount: category.eventCount || 0,
            }))
            .filter((category) => category.eventCount > 0)
            .sort((a, b) => b.eventCount - a.eventCount);

        const total = normalized.reduce((sum, category) => sum + category.eventCount, 0);
        if (!total) return [];

        return normalized.map((category) => ({
            id: category.id,
            name: category.name,
            eventCount: category.eventCount,
            percent: category.eventCount / total,
        }));
    }, [categories]);

    const totalEvents = useMemo(
        () => data.reduce((sum, category) => sum + category.eventCount, 0),
        [data]
    );

    const navigateToCategory = (name: string) => {
        const slug = categoryNameToSlug(name);
        router.push(`/events/category/${slug}`);
    };

    const handlePieClick = (entry: { name?: string } | undefined) => {
        if (entry?.name) {
            navigateToCategory(entry.name);
        }
    };

    if (data.length === 0) {
        return (
            <div className="flex h-[300px] items-center justify-center rounded-xl border border-dashed border-border-subtle bg-background-secondary/50">
                <p className="text-sm text-foreground-tertiary">No category data available</p>
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className="relative mx-auto h-[250px] sm:h-[300px] lg:h-[330px] w-full max-w-[440px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius="56%"
                            outerRadius="86%"
                            paddingAngle={2}
                            dataKey="eventCount"
                            nameKey="name"
                            onClick={handlePieClick}
                            cursor="pointer"
                            stroke="none"
                        >
                            {data.map((entry, index) => (
                                <Cell
                                    key={entry.id}
                                    fill={COLORS[index % COLORS.length]}
                                    className="hover:opacity-80 transition-opacity duration-300 outline-none"
                                />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={CUSTOM_TOOLTIP_STYLE}
                            itemStyle={{ color: '#fafafa' }}
                            formatter={(value: number, name: string) => [`${value} events`, name]}
                            cursor={false}
                        />
                    </PieChart>
                </ResponsiveContainer>

                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold text-foreground-primary">
                            {totalEvents}
                        </span>
                        <span className="text-xs text-foreground-tertiary uppercase tracking-wide">
                            Total Events
                        </span>
                    </div>
                </div>
            </div>

            <ul className="mt-4 flex flex-col max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {data.map((entry, index) => (
                    <li key={`legend-${entry.id}`}>
                        <button
                            type="button"
                            onClick={() => navigateToCategory(entry.name)}
                            className="w-full flex items-center justify-between gap-2 border-b border-border-subtle py-3 px-2 text-left hover:bg-background-tertiary/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                            aria-label={`${entry.name}: ${entry.eventCount} events`}
                        >
                            <span className="flex items-center gap-2 min-w-0">
                                <span
                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                />
                                <span className="text-sm text-foreground-secondary truncate">
                                    {entry.name}
                                </span>
                            </span>
                            <span className="text-xs text-foreground-tertiary shrink-0">
                                {entry.eventCount} ({Math.round(entry.percent * 100)}%)
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}
