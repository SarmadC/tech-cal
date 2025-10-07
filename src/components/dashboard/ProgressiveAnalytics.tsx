'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useServerSideAnalytics } from '@/hooks/useServerSideAnalytics';
import { CareerAnalyticsCard } from '@/components/dashboard/CareerAnalyticsCard';
import { CareerInsightsCard } from '@/components/dashboard/CareerInsightsCard';
import { CareerRecommendationsCard, QuickCareerActionsCard } from '@/components/dashboard/CareerRecommendationsCard';
import { Button } from '@/components/ui/button';
import { TargetIcon, SpinnerIcon } from '@phosphor-icons/react';
import { NavigationUtils } from '@/utils/navigationUtils';
import { calculateBasicAnalytics } from '@/utils/analyticsUtils';
import type { AppProfile, TrackedEventRecord, Event } from '@/types';
import type { OptimizedAnalyticsData, OptimizedRecommendation } from '@/services/optimizedAnalyticsService';

interface ProgressiveAnalyticsProps {
  userProfile: AppProfile;
  trackedEvents: TrackedEventRecord[];
  upcomingEvents: Event[];
}

export function ProgressiveAnalytics({
  userProfile,
  trackedEvents,
  upcomingEvents
}: ProgressiveAnalyticsProps) {
  const [showDetailedAnalytics, setShowDetailedAnalytics] = useState(false);
  const [hasLoadedDetailed, setHasLoadedDetailed] = useState(false);

  // Calculate basic analytics from props instead of API call
  const basicAnalytics = useMemo(() => {
    return calculateBasicAnalytics(trackedEvents, upcomingEvents);
  }, [trackedEvents, upcomingEvents]);

  // Calculate upcoming opportunities from props (currently unused)
  // const upcomingOpportunities = useMemo(() => {
  //   return calculateUpcomingOpportunities(upcomingEvents);
  // }, [upcomingEvents]);

  // Load detailed analytics only when requested or after delay
  const { 
    data: detailedAnalytics, 
    isLoading: detailedLoading, 
    error: _detailedError,
    refetch: _refetchDetailed
  } = useServerSideAnalytics({ 
    includeRecommendations: true,
    eventLimit: 50,
    enabled: showDetailedAnalytics && !!userProfile 
  });

  // Auto-load detailed analytics after 2 seconds if basic analytics calculated successfully
  useEffect(() => {
    if (basicAnalytics && !hasLoadedDetailed && !showDetailedAnalytics) {
      const timer = setTimeout(() => {
        setShowDetailedAnalytics(true);
        setHasLoadedDetailed(true);
      }, 2000); // 2 second delay

      return () => clearTimeout(timer);
    }
  }, [basicAnalytics, hasLoadedDetailed, showDetailedAnalytics]);

  const handleLoadDetailed = () => {
    setShowDetailedAnalytics(true);
    setHasLoadedDetailed(true);
  };

  // Convert basic analytics to detailed format for compatibility
  const analyticsData = detailedAnalytics?.analytics as OptimizedAnalyticsData | undefined;
  const recommendations = (detailedAnalytics?.recommendations || []) as OptimizedRecommendation[];

  // Basic analytics are now calculated from props, so no loading or error states needed

  // Show basic analytics with option to load detailed
  if (basicAnalytics && !analyticsData) {
    return (
      <div className="space-y-6">
        {/* Basic Analytics Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Career Analytics
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                Basic View
              </span>
              {detailedLoading && (
                <SpinnerIcon className="w-4 h-4 animate-spin text-blue-600" />
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {basicAnalytics.completedEvents}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Events Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {basicAnalytics.totalTracked}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Events Attended</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {basicAnalytics.upcomingEvents}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Upcoming Events</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {Math.round(basicAnalytics.averageAttendees)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Avg Attendees</div>
            </div>
          </div>

          {!showDetailedAnalytics && (
            <div className="text-center">
              <Button 
                onClick={handleLoadDetailed}
                disabled={detailedLoading}
                className="w-full sm:w-auto"
              >
                {detailedLoading ? (
                  <>
                    <SpinnerIcon className="w-4 h-4 mr-2 animate-spin" />
                    Loading Detailed Analytics...
                  </>
                ) : (
                  'Load Detailed Analytics'
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <QuickCareerActionsCard actions={[
          {
            id: 'complete-profile',
            title: 'Complete Career Profile',
            description: 'Add skills and goals for better recommendations',
            actionText: 'Complete',
            priority: 'high' as const,
            onAction: () => window.location.href = NavigationUtils.goToSettings('career')
          },
          {
            id: 'browse-events',
            title: 'Explore Events',
            description: 'Find events matching your interests',
            actionText: 'Browse',
            priority: 'medium' as const,
            onAction: () => window.location.href = NavigationUtils.goToCalendar()
          }
        ]} />
      </div>
    );
  }

  // Show detailed analytics when available
  if (analyticsData) {
    return (
      <div className="space-y-6">
        {analyticsData && (
          <CareerAnalyticsCard analyticsData={analyticsData} />
        )}
        
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <CareerInsightsCard 
              topOpportunities={upcomingEvents}
            />
          </div>
          <div>
            <QuickCareerActionsCard actions={[
              {
                id: 'complete-profile',
                title: 'Complete Career Profile',
                description: 'Add skills and goals for better recommendations',
                actionText: 'Complete',
                priority: 'high' as const,
                onAction: () => window.location.href = NavigationUtils.goToSettings('career')
              },
              {
                id: 'browse-events',
                title: 'Explore Events',
                description: 'Find events matching your interests',
                actionText: 'Browse',
                priority: 'medium' as const,
                onAction: () => window.location.href = NavigationUtils.goToCalendar()
              }
            ]} />
          </div>
        </div>
        
        {recommendations.length > 0 && (
          <CareerRecommendationsCard
            recommendations={recommendations}
            userProfile={userProfile}
            onEventSelect={(event) => window.location.href = NavigationUtils.goToEvent(event.id, event.title)}
            onRecommendationAction={(rec) => console.log('Action for recommendation:', rec)}
          />
        )}
      </div>
    );
  }

  // Fallback state
  return (
    <div className="text-center py-12">
      <TargetIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
      <h3 className="font-medium text-gray-900 dark:text-white mb-2">No Analytics Data Available</h3>
      <p className="text-gray-600 dark:text-gray-300 mb-4">
        We need more data to generate personalized insights. Try tracking some events or completing your profile.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button asChild variant="outline">
          <a href={NavigationUtils.goToCalendar()}>Browse Events</a>
        </Button>
        <Button asChild>
          <a href={NavigationUtils.goToSettings('career')}>Complete Profile</a>
        </Button>
      </div>
    </div>
  );
}
