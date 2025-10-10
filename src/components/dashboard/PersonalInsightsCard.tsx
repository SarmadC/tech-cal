import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface PersonalInsight {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
}

interface PersonalInsightsCardProps {
  insights: PersonalInsight[];
  className?: string;
}

/**
 * Reusable component for displaying personal insights in a grid
 */
export function PersonalInsightsCard({ insights, className = '' }: PersonalInsightsCardProps) {
  return (
    <div className={`grid gap-6 md:grid-cols-2 lg:grid-cols-4 ${className}`}>
      {insights.map((insight, index) => (
        <Card key={index} className="relative overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
          <CardHeader className="pb-2">
            <div className="p-2 bg-gray-100 rounded-lg w-fit">{insight.icon}</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-800">{insight.value}</div>
            <p className="text-sm text-gray-600">{insight.title}</p>
            <p className="text-xs text-gray-500">{insight.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
