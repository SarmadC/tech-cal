import React from 'react';
import { ResponsiveContainer } from 'recharts';

interface ChartWrapperProps {
  children: React.ReactElement;
  height?: number;
  className?: string;
}

export function ChartWrapper({ children, height = 200, className = '' }: ChartWrapperProps) {
  return (
    <div className={`w-full ${className}`} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}