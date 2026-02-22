'use client';

import { useMemo } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    LabelList,
    ResponsiveContainer,
    Tooltip,
    XAxis,
} from 'recharts';

interface PriceHistogramBin {
    label: string;
    count: number;
    range: string;
}

interface PriceHistogramProps {
    bins: PriceHistogramBin[];
}

const TOOLTIP_STYLE = {
    backgroundColor: 'rgba(24, 24, 27, 0.92)',
    borderColor: 'rgba(63, 63, 70, 0.55)',
    backdropFilter: 'blur(8px)',
    color: '#fafafa',
    borderRadius: '8px',
    padding: '8px 12px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
};

export function PriceHistogram({ bins }: PriceHistogramProps) {
    const unknownCount = useMemo(
        () => bins.find((bin) => bin.label === 'Unknown')?.count ?? 0,
        [bins]
    );

    const histogramBins = useMemo(
        () => bins.filter((bin) => bin.label !== 'Unknown'),
        [bins]
    );

    const totalKnown = useMemo(
        () => histogramBins.reduce((sum, bin) => sum + bin.count, 0),
        [histogramBins]
    );

    const chartData = useMemo(
        () =>
            histogramBins.map((bin) => ({
                ...bin,
                percent: totalKnown > 0 ? Math.round((bin.count / totalKnown) * 100) : 0,
                valueLabel: bin.count > 0 ? `${bin.count}` : '',
            })),
        [histogramBins, totalKnown]
    );

    if (chartData.length === 0) {
        return null;
    }

    return (
        <div className="w-full space-y-4 mt-8 pt-6 border-t border-border-subtle">
            <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-foreground-primary">
                    Price Distribution
                </h3>
                {unknownCount > 0 && (
                    <span className="text-[11px] text-foreground-tertiary">
                        {unknownCount} unknown
                    </span>
                )}
            </div>

            {totalKnown === 0 ? (
                <div className="rounded-lg border border-dashed border-border-subtle bg-background-secondary/40 px-4 py-5 text-center">
                    <p className="text-sm text-foreground-tertiary">
                        No priced events available yet.
                    </p>
                </div>
            ) : (
                <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={chartData}
                            margin={{ top: 12, right: 14, left: 6, bottom: 22 }}
                            barCategoryGap="22%"
                        >
                            <CartesianGrid
                                stroke="rgba(113, 113, 122, 0.18)"
                                vertical={false}
                            />
                            <XAxis
                                dataKey="label"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#a1a1aa', fontSize: 11 }}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(113, 113, 122, 0.12)' }}
                                contentStyle={TOOLTIP_STYLE}
                                itemStyle={{ color: '#fafafa' }}
                                formatter={(
                                    value: number,
                                    _name: string,
                                    item: { payload?: { percent: number } }
                                ) => [
                                    `${value} events (${item?.payload?.percent ?? 0}%)`,
                                    'Count',
                                ]}
                                labelFormatter={(label) => {
                                    const current = chartData.find((bin) => bin.label === label);
                                    return current?.range || label;
                                }}
                            />
                            <Bar
                                dataKey="count"
                                fill="hsl(var(--primary))"
                                fillOpacity={0.85}
                                radius={[6, 6, 0, 0]}
                                minPointSize={3}
                            >
                                <LabelList
                                    dataKey="valueLabel"
                                    position="top"
                                    fill="#a1a1aa"
                                    fontSize={11}
                                />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}
