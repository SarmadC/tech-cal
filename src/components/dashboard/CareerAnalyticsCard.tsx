import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CareerImpactBadge } from '@/components/ui/career-impact-badge';
import { Event } from '@/types';
import { CareerImpactScoreLite } from '@/types/careerImpact';
import { 
  TrendUpIcon, 
  TrendDownIcon, 
  TargetIcon, 
  ChartLineUpIcon,
  BrainIcon,
  RocketIcon,
  StarIcon,
  CalendarIcon
} from '@phosphor-icons/react';

interface CareerAnalyticsData {
  averageImpactScore: number;
  impactTrend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  skillsGrowth: Array<{
    skill: string;
    progress: number;
    events: number;
  }>;
  careerGoalProgress: {
    currentLevel: string;
    targetLevel: string;
    progress: number;
  };
  monthlyStats: {
    eventsAttended: number;
    highImpactEvents: number;
    skillsImproved: number;
    networkingEvents: number;
  };
  upcomingOpportunities: Array<Event & { careerImpactLite?: CareerImpactScoreLite }>;
}

interface CareerAnalyticsCardProps {
  analyticsData: CareerAnalyticsData;
  className?: string;
}

/**
 * Comprehensive Career Analytics Dashboard Card
 */
export function CareerAnalyticsCard({ analyticsData, className }: CareerAnalyticsCardProps) {
  const {
    averageImpactScore,
    impactTrend,
    trendPercentage,
    skillsGrowth,
    careerGoalProgress,
    monthlyStats,
    upcomingOpportunities
  } = analyticsData;

  const TrendIcon = impactTrend === 'up' ? TrendUpIcon : 
                   impactTrend === 'down' ? TrendDownIcon : ChartLineUpIcon;
  
  const trendColor = impactTrend === 'up' ? 'text-green-600' : 
                     impactTrend === 'down' ? 'text-red-600' : 'text-gray-600';

  return (
    <div className={`grid gap-6 md:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {/* Career Impact Overview */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TargetIcon className="w-5 h-5 text-blue-600" />
            Career Impact Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Impact Score & Trend */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-gray-900">
                {Math.round(averageImpactScore)}
              </div>
              <div className="text-sm text-gray-500">Average Impact Score</div>
            </div>
            <div className={`flex items-center gap-2 ${trendColor}`}>
              <TrendIcon className="w-5 h-5" />
              <span className="font-semibold">
                {trendPercentage > 0 ? '+' : ''}{trendPercentage}%
              </span>
            </div>
          </div>

          {/* Monthly Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-xl font-bold text-blue-600">
                {monthlyStats.eventsAttended}
              </div>
              <div className="text-xs text-gray-600">Events Attended</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-xl font-bold text-green-600">
                {monthlyStats.highImpactEvents}
              </div>
              <div className="text-xs text-gray-600">High Impact</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-xl font-bold text-purple-600">
                {monthlyStats.skillsImproved}
              </div>
              <div className="text-xs text-gray-600">Skills Improved</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-xl font-bold text-orange-600">
                {monthlyStats.networkingEvents}
              </div>
              <div className="text-xs text-gray-600">Networking</div>
            </div>
          </div>

          {/* Career Goal Progress */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Career Goal Progress</span>
              <span className="text-sm text-gray-500">
                {careerGoalProgress.currentLevel} → {careerGoalProgress.targetLevel}
              </span>
            </div>
            <Progress value={careerGoalProgress.progress} className="h-2" />
            <div className="text-xs text-gray-500 text-right">
              {Math.round(careerGoalProgress.progress)}% complete
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skills Growth */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainIcon className="w-5 h-5 text-purple-600" />
            Skills Growth
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {skillsGrowth.slice(0, 4).map((skill) => (
            <div key={skill.skill} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700 truncate">
                  {skill.skill}
                </span>
                <Badge variant="outline" className="text-xs">
                  {skill.events} events
                </Badge>
              </div>
              <Progress value={skill.progress} className="h-1.5" />
            </div>
          ))}
          
          {skillsGrowth.length > 4 && (
            <div className="text-center pt-2">
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                View all {skillsGrowth.length} skills →
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming High-Impact Opportunities */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RocketIcon className="w-5 h-5 text-green-600" />
            High-Impact Opportunities This Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {upcomingOpportunities.slice(0, 6).map((event) => (
              <div key={event.id} className="p-3 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900 line-clamp-2 flex-1">
                    {event.title}
                  </h4>
                  {event.careerImpactLite && (
                    <CareerImpactBadge 
                      score={event.careerImpactLite}
                      variant="compact"
                      className="ml-2 flex-shrink-0"
                    />
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <CalendarIcon className="w-3 h-3" />
                  <span>
                    {new Date(event.startTime).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                  <span>•</span>
                  <span>{event.category?.name || 'Event'}</span>
                </div>
              </div>
            ))}
          </div>

          {upcomingOpportunities.length > 6 && (
            <div className="text-center pt-4 border-t border-gray-100 mt-4">
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                View all {upcomingOpportunities.length} opportunities →
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Career Insights Summary Card - Compact version for dashboard overview
 */
interface CareerInsightsSummaryProps {
  totalOpportunities: number;
  averageImpactScore: number;
  trendDirection: 'up' | 'down' | 'stable';
  topSkill: string;
  className?: string;
}

export function CareerInsightsSummary({
  totalOpportunities,
  averageImpactScore,
  trendDirection,
  topSkill,
  className
}: CareerInsightsSummaryProps) {
  const TrendIcon = trendDirection === 'up' ? TrendUpIcon : 
                   trendDirection === 'down' ? TrendDownIcon : ChartLineUpIcon;
  
  const trendColor = trendDirection === 'up' ? 'text-green-600' : 
                     trendDirection === 'down' ? 'text-red-600' : 'text-gray-600';

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <StarIcon className="w-5 h-5 text-yellow-500" />
          Career Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {totalOpportunities}
            </div>
            <div className="text-xs text-gray-500">Opportunities</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {Math.round(averageImpactScore)}
            </div>
            <div className="text-xs text-gray-500">Avg Impact</div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Top Focus: <span className="font-medium text-gray-900">{topSkill}</span>
          </div>
          <div className={`flex items-center gap-1 ${trendColor}`}>
            <TrendIcon className="w-4 h-4" />
            <span className="text-xs font-medium capitalize">{trendDirection}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
