import React from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { ChartWrapper } from './ChartWrapper';

// Theme colors for consistency
const CHART_COLORS = {
    primary: 'hsl(var(--chart-1))',
    secondary: 'hsl(var(--chart-2))',
    tertiary: 'hsl(var(--chart-3))',
    quaternary: 'hsl(var(--chart-4))',
    gray: 'hsl(var(--muted-foreground))'
};

const PIE_COLORS = [CHART_COLORS.primary, CHART_COLORS.secondary, CHART_COLORS.tertiary, CHART_COLORS.quaternary];

interface BaseChartProps {
    height?: number;
    className?: string;
}

// Line Chart for trends
interface TrendChartProps extends BaseChartProps {
    data: Array<{ name: string; value: number }>;
    color?: string;
}

export function TrendChart({ data, height = 120, className = '', color = CHART_COLORS.primary }: TrendChartProps) {
    return (
        <ChartWrapper height={height} className={className}>
            <LineChart data={data}>
                <Line
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    strokeWidth={2}
                    dot={{ fill: color, strokeWidth: 2, r: 3 }}
                    activeDot={{ r: 4, stroke: color, strokeWidth: 2 }}
                />
                <XAxis dataKey="name" hide />
                <YAxis hide />
                <Tooltip
                    labelStyle={{ color: '#374151' }}
                    contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '12px'
                    }}
                />
            </LineChart>
        </ChartWrapper>
    );
}

// Bar Chart for comparisons
interface ComparisonChartProps extends BaseChartProps {
    data: Array<{ name: string; value: number }>;
    color?: string;
    showValueLabels?: boolean;
    valueLabelColor?: string;
}

export function ComparisonChart({
    data,
    height = 120,
    className = '',
    color = CHART_COLORS.primary,
    showValueLabels = false,
    valueLabelColor = 'hsl(var(--foreground))'
}: ComparisonChartProps) {
    const valueLabelRenderer = showValueLabels
        ? ({ x = 0, y = 0, width = 0, value }: { x?: number; y?: number; width?: number; value?: number | string }) => {
            const numericValue = typeof value === 'number' ? value : Number(value ?? 0);
            const labelX = x + (width / 2);
            // Render labels above bars while preventing top clipping.
            const labelY = Math.max(10, y - 8);

            return (
                <text
                    x={labelX}
                    y={labelY}
                    textAnchor="middle"
                    fill={valueLabelColor}
                    fontSize={11}
                    fontWeight={600}
                >
                    {Number.isFinite(numericValue) ? numericValue : value}
                </text>
            );
        }
        : false;

    return (
        <ChartWrapper height={height} className={className}>
            <BarChart
                data={data}
                margin={showValueLabels ? { top: 18, right: 0, left: 0, bottom: 0 } : undefined}
            >
                <Bar
                    dataKey="value"
                    fill={color}
                    radius={[2, 2, 0, 0]}
                    label={valueLabelRenderer}
                />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} />
                <YAxis hide />
                <Tooltip
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                        fontSize: '12px'
                    }}
                />
            </BarChart>
        </ChartWrapper>
    );
}

// Pie Chart for distributions
interface DistributionChartProps extends BaseChartProps {
    data: Array<{ name: string; value: number }>;
    showLegend?: boolean;
}

export function DistributionChart({ data, height = 200, className = '', showLegend = false }: DistributionChartProps) {
    return (
        <ChartWrapper height={height} className={className}>
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={height * 0.3}
                    paddingAngle={2}
                    dataKey="value"
                >
                    {data.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip
                    formatter={(value, name) => [`${value}`, name]}
                    contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '12px'
                    }}
                />
                {showLegend && <Legend />}
            </PieChart>
        </ChartWrapper>
    );
}
