// src/components/growth/ChartComponents.tsx
'use client';

import React, { FC } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// --- Type Definitions ---
// Note: TechStackCurrencyData interface removed as it's not currently used

// --- Chart Components ---

export const IndustryPulseScoreChart: FC<{ score: number }> = ({ score }) => {
    const data = [{ name: 'Score', value: score }, { name: 'Remaining', value: 100 - score }];
    const colors = ['#3b82f6', '#e5e7eb'];
    
    return (
        <ResponsiveContainer width="100%" height={150}>
            <PieChart>
                <Pie 
                    data={data} 
                    dataKey="value" 
                    nameKey="name" 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={50} 
                    outerRadius={70} 
                    startAngle={90} 
                    endAngle={-270} 
                    paddingAngle={0} 
                    cornerRadius={50}
                >
                    {data.map((entry, index) => (
                        <Cell 
                            key={`cell-${index}`} 
                            fill={colors[index % colors.length]} 
                            stroke={colors[index % colors.length]} 
                        />
                    ))}
                </Pie>
                <text 
                    x="50%" 
                    y="50%" 
                    textAnchor="middle" 
                    dominantBaseline="middle" 
                    className="text-3xl font-bold text-gray-800"
                >
                    {score}%
                </text>
            </PieChart>
        </ResponsiveContainer>
    );
};

// Note: TechStackCurrencyChart removed as it's not currently used
// The TechStackCurrencyCard uses progress bars instead of charts
