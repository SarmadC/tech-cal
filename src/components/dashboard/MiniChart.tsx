import React from 'react';

interface MiniChartProps {
  data: number[];
  height?: number;
  color?: string;
  className?: string;
}

/**
 * Simple mini chart component for showing trends
 */
export function MiniChart({ 
  data, 
  height = 40, 
  color = 'text-blue-500',
  className = '' 
}: MiniChartProps) {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className={`w-full ${className}`} style={{ height }}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="overflow-visible"
      >
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
          className={color}
        />
        {/* Fill area under the line */}
        <polygon
          fill="currentColor"
          fillOpacity="0.1"
          points={`0,100 ${points} 100,100`}
          className={color}
        />
      </svg>
    </div>
  );
}

/**
 * Bar chart component for comparing values
 */
interface MiniBarChartProps {
  data: Array<{ label: string; value: number; color?: string }>;
  height?: number;
  className?: string;
}

export function MiniBarChart({ 
  data, 
  height = 40, 
  className = '' 
}: MiniBarChartProps) {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data.map(d => d.value));
  // const barWidth = 100 / data.length; // Unused variable removed

  return (
    <div className={`w-full flex items-end gap-1 ${className}`} style={{ height }}>
      {data.map((item, index) => {
        const barHeight = (item.value / max) * 100;
        return (
          <div
            key={index}
            className="flex-1 bg-blue-500 rounded-t-sm opacity-80 hover:opacity-100 transition-opacity"
            style={{ 
              height: `${barHeight}%`,
              backgroundColor: item.color || undefined
            }}
            title={`${item.label}: ${item.value}`}
          />
        );
      })}
    </div>
  );
}
