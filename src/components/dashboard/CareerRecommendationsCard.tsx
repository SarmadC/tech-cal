import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CareerImpactBadge } from '@/components/ui/career-impact-badge';
import { Event, AppProfile } from '@/types';
import { CareerImpactScoreLite } from '@/types/careerImpact';
import { 
  LightbulbIcon,
  TrendUpIcon,
  UsersIcon,
  ClockIcon,
  MapPinIcon,
  ArrowRightIcon,
  SparkleIcon,
  TargetIcon
} from '@phosphor-icons/react';

interface CareerRecommendation {
  id: string;
  type: 'skill_gap' | 'networking' | 'career_advancement' | 'trending_topic' | 'learning_path';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  events: Array<Event & { careerImpactLite?: CareerImpactScoreLite }>;
  actionable: boolean;
  estimatedImpact: number;
  timeToComplete?: string;
  reason: string;
}

interface CareerRecommendationsCardProps {
  recommendations: CareerRecommendation[];
  userProfile: AppProfile;
  onEventSelect?: (event: Event) => void;
  onRecommendationAction?: (recommendation: CareerRecommendation) => void;
  className?: string;
}

/**
 * Intelligent Career Recommendations Card
 */
export function CareerRecommendationsCard({
  recommendations,
  userProfile: _userProfile,
  onEventSelect,
  onRecommendationAction,
  className
}: CareerRecommendationsCardProps) {
  // Sort recommendations by priority and impact
  const sortedRecommendations = React.useMemo(() => {
    return recommendations.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      const priorityScore = priorityWeight[b.priority] - priorityWeight[a.priority];
      if (priorityScore !== 0) return priorityScore;
      return b.estimatedImpact - a.estimatedImpact;
    });
  }, [recommendations]);

  const getRecommendationIcon = (type: CareerRecommendation['type']) => {
    switch (type) {
      case 'skill_gap':
        return <TrendUpIcon className="w-4 h-4" />;
      case 'networking':
        return <UsersIcon className="w-4 h-4" />;
      case 'career_advancement':
        return <TargetIcon className="w-4 h-4" />;
      case 'trending_topic':
        return <SparkleIcon className="w-4 h-4" />;
      case 'learning_path':
        return <LightbulbIcon className="w-4 h-4" />;
      default:
        return <LightbulbIcon className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: CareerRecommendation['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-700 border-green-200';
    }
  };

  const getTypeLabel = (type: CareerRecommendation['type']) => {
    switch (type) {
      case 'skill_gap':
        return 'Skill Gap';
      case 'networking':
        return 'Networking';
      case 'career_advancement':
        return 'Career Growth';
      case 'trending_topic':
        return 'Trending';
      case 'learning_path':
        return 'Learning Path';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LightbulbIcon className="w-5 h-5 text-yellow-500" />
          Personalized Career Recommendations
        </CardTitle>
        <p className="text-sm text-gray-600">
          Based on your profile and career goals
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {sortedRecommendations.slice(0, 4).map((recommendation) => (
          <div key={recommendation.id} className="space-y-3">
            {/* Recommendation Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div className="p-2 bg-gray-100 rounded-lg flex-shrink-0">
                  {getRecommendationIcon(recommendation.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900">
                      {recommendation.title}
                    </h4>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getPriorityColor(recommendation.priority)}`}
                    >
                      {getTypeLabel(recommendation.type)}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    {recommendation.description}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <TargetIcon className="w-3 h-3" />
                      Impact: {recommendation.estimatedImpact}/100
                    </span>
                    {recommendation.timeToComplete && (
                      <span className="flex items-center gap-1">
                        <ClockIcon className="w-3 h-3" />
                        {recommendation.timeToComplete}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <CareerImpactBadge 
                score={recommendation.estimatedImpact}
                variant="compact"
                className="flex-shrink-0"
              />
            </div>

            {/* Reason */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Why this matters:</strong> {recommendation.reason}
              </p>
            </div>

            {/* Recommended Events */}
            {recommendation.events.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-gray-700">
                  Recommended Events ({recommendation.events.length}):
                </h5>
                <div className="grid gap-2">
                  {recommendation.events.slice(0, 2).map((event) => (
                    <div 
                      key={event.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => onEventSelect?.(event)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {event.title}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                          <ClockIcon className="w-3 h-3" />
                          <span>
                            {new Date(event.startTime).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                          {event.location && (
                            <>
                              <span>•</span>
                              <MapPinIcon className="w-3 h-3" />
                              <span className="truncate max-w-24">
                                {event.location}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      {event.careerImpactLite && (
                        <CareerImpactBadge 
                          score={event.careerImpactLite}
                          variant="compact"
                          className="ml-2 flex-shrink-0"
                        />
                      )}
                    </div>
                  ))}
                  
                  {recommendation.events.length > 2 && (
                    <button className="text-xs text-blue-600 hover:text-blue-700 font-medium text-left">
                      View {recommendation.events.length - 2} more events →
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Action Button */}
            {recommendation.actionable && (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRecommendationAction?.(recommendation)}
                  className="text-xs"
                >
                  Take Action
                  <ArrowRightIcon className="w-3 h-3 ml-1" />
                </Button>
              </div>
            )}
          </div>
        ))}

        {/* View More */}
        {recommendations.length > 4 && (
          <div className="text-center pt-4 border-t border-gray-100">
            <Button variant="outline" size="sm">
              View All {recommendations.length} Recommendations
              <ArrowRightIcon className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Empty State */}
        {recommendations.length === 0 && (
          <div className="text-center py-8">
            <LightbulbIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">No recommendations yet</h3>
            <p className="text-sm text-gray-600 mb-4">
              Complete your career profile and track some events to get personalized recommendations.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Quick Career Actions Card - Compact actionable recommendations
 */
interface QuickCareerActionsProps {
  actions: Array<{
    id: string;
    title: string;
    description: string;
    actionText: string;
    priority: 'high' | 'medium' | 'low';
    onAction: () => void;
  }>;
  className?: string;
}

export function QuickCareerActionsCard({ actions, className }: QuickCareerActionsProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SparkleIcon className="w-5 h-5 text-purple-500" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.slice(0, 3).map((action) => (
          <div key={action.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900">
                {action.title}
              </div>
              <div className="text-xs text-gray-600">
                {action.description}
              </div>
            </div>
            <Button
              size="sm"
              variant={action.priority === 'high' ? 'default' : 'outline'}
              onClick={action.onAction}
              className="ml-3 text-xs"
            >
              {action.actionText}
            </Button>
          </div>
        ))}
        
        {actions.length === 0 && (
          <div className="text-center py-4 text-sm text-gray-500">
            No actions available right now
          </div>
        )}
      </CardContent>
    </Card>
  );
}
