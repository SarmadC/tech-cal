import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
// Career impact components removed - using inline implementation
import { Event } from '@/types';
import { CareerImpactScoreLite } from '@/types/careerImpact';
import { TargetIcon, TrendUpIcon, SparkleIcon } from '@phosphor-icons/react';

interface CareerInsightsCardProps {
  topOpportunities: (Event & { careerImpactLite?: CareerImpactScoreLite })[];
  className?: string;
}

/**
 * Dashboard card showing top career opportunities with impact scores
 */
export function CareerInsightsCard({ topOpportunities, className }: CareerInsightsCardProps) {
  // Calculate insights from the opportunities
  const insights = React.useMemo(() => {
    if (topOpportunities.length === 0) {
      return {
        averageScore: 0,
        highImpactCount: 0,
        topCategories: [],
        totalOpportunities: 0
      };
    }

    const scores = topOpportunities
      .map(event => event.careerImpactLite?.overall || 0)
      .filter(score => score > 0);

    const averageScore = scores.length > 0 
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
      : 0;

    const highImpactCount = scores.filter(score => score >= 80).length;

    const categoryCount = topOpportunities.reduce((acc, event) => {
      const category = event.category?.name || 'Other';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topCategories = Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category);

    return {
      averageScore,
      highImpactCount,
      topCategories,
      totalOpportunities: topOpportunities.length
    };
  }, [topOpportunities]);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <TargetIcon className="w-5 h-5 text-blue-600" />
            Career Opportunities
          </CardTitle>
          {insights.averageScore > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-md">
              <div className={`
                w-2 h-2 rounded-full
                ${insights.averageScore >= 80 ? 'bg-green-400' :
                  insights.averageScore >= 50 ? 'bg-blue-400' :
                  insights.averageScore >= 20 ? 'bg-yellow-400' : 'bg-gray-400'}
              `} />
              <span className="text-xs font-medium">
                {Math.round(insights.averageScore)}%
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {insights.totalOpportunities}
            </div>
            <div className="text-xs text-gray-500">Opportunities</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {insights.highImpactCount}
            </div>
            <div className="text-xs text-gray-500">High Impact</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {Math.round(insights.averageScore)}
            </div>
            <div className="text-xs text-gray-500">Avg Score</div>
          </div>
        </div>

        {/* Top Categories */}
        {insights.topCategories.length > 0 && (
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Top Categories:</div>
            <div className="flex flex-wrap gap-1">
              {insights.topCategories.map((category) => (
                <Badge key={category} variant="outline" className="text-xs">
                  {category}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Top Opportunities */}
        {topOpportunities.slice(0, 3).map((event) => (
          <div key={event.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {event.title}
              </div>
              <div className="text-xs text-gray-500">
                {event.category?.name || 'Event'}
              </div>
            </div>
            {event.careerImpactLite && (
              <div className="ml-2">
                <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-md">
                  <div className={`
                    w-2 h-2 rounded-full
                    ${event.careerImpactLite!.overall >= 80 ? 'bg-green-400' :
                      event.careerImpactLite!.overall >= 50 ? 'bg-blue-400' :
                      event.careerImpactLite!.overall >= 20 ? 'bg-yellow-400' : 'bg-gray-400'}
                  `} />
                  <span className="text-xs font-medium">
                    {Math.round(event.careerImpactLite!.overall)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Call to Action */}
        {insights.totalOpportunities > 3 && (
          <div className="text-center pt-2">
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View all {insights.totalOpportunities} opportunities →
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact Career Progress Card for dashboard
 */
interface CareerProgressCardProps {
  recentScores: number[];
  className?: string;
}

export function CareerProgressCard({ recentScores, className }: CareerProgressCardProps) {
  const trend = React.useMemo(() => {
    if (recentScores.length < 2) return 'stable';
    
    const recent = recentScores.slice(-3);
    const first = recent[0];
    const last = recent[recent.length - 1];
    
    if (last > first + 5) return 'improving';
    if (last < first - 5) return 'declining';
    return 'stable';
  }, [recentScores]);

  const averageScore = recentScores.length > 0 
    ? recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length 
    : 0;

  const trendIcon = trend === 'improving' ? TrendUpIcon : SparkleIcon;
  const trendColor = trend === 'improving' ? 'text-green-600' : 
                    trend === 'declining' ? 'text-red-600' : 'text-gray-600';

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          {React.createElement(trendIcon, { className: `w-5 h-5 ${trendColor}` })}
          Career Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {Math.round(averageScore)}
          </div>
          <div className="text-sm text-gray-500 mb-3">Average Impact Score</div>
          
          <div className={`text-sm font-medium capitalize ${trendColor}`}>
            {trend === 'improving' ? '📈 Improving' : 
             trend === 'declining' ? '📉 Needs Focus' : '➡️ Stable'}
          </div>
          
          {recentScores.length > 0 && (
            <div className="mt-3 text-xs text-gray-500">
              Based on {recentScores.length} recent event{recentScores.length === 1 ? '' : 's'}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
