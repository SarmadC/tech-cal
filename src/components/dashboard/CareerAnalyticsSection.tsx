'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { TargetIcon } from '@phosphor-icons/react';
import { useServerSideAnalytics } from '@/hooks/useServerSideAnalytics';
import { CareerProfileService } from '@/services/careerProfileService';
import { CareerAnalyticsCard } from '@/components/dashboard/CareerAnalyticsCard';
import { CareerInsightsCard } from '@/components/dashboard/CareerInsightsCard';
import { CareerRecommendationsCard, QuickCareerActionsCard } from '@/components/dashboard/CareerRecommendationsCard';
import { NavigationUtils } from '@/utils/navigationUtils';
import type { AppProfile, TrackedEventRecord, Event } from '@/types';
import type { CareerAnalyticsData, CareerRecommendation } from '@/services/careerAnalyticsService';

interface CareerAnalyticsSectionProps {
  userProfile: AppProfile;
  trackedEvents: TrackedEventRecord[];
  upcomingEvents: Event[];
}

export function CareerAnalyticsSection({
  userProfile,
  trackedEvents: _trackedEvents,
  upcomingEvents: _upcomingEvents
}: CareerAnalyticsSectionProps) {
  const router = useRouter();
  
  const { 
    data: serverAnalytics, 
    isLoading, 
    error,
    refetch
  } = useServerSideAnalytics({ 
    includeRecommendations: true,
    eventLimit: 50,
    enabled: !!userProfile 
  });

  // Add timeout to prevent infinite loading
  const [hasTimedOut, setHasTimedOut] = React.useState(false);
  
  React.useEffect(() => {
    if (isLoading && !hasTimedOut) {
      const timeout = setTimeout(() => {
        setHasTimedOut(true);
      }, 10000); // 10 second timeout
      
      return () => clearTimeout(timeout);
    }
  }, [isLoading, hasTimedOut]);

  const analyticsData = serverAnalytics?.analytics as CareerAnalyticsData | undefined;
  const recommendations = useMemo(() => 
    (serverAnalytics?.recommendations || []) as CareerRecommendation[], 
    [serverAnalytics?.recommendations]
  );

  // Debug logging to help identify issues (only in development)
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('CareerAnalyticsSection debug:', {
        isLoading,
        hasError: !!error,
        hasServerAnalytics: !!serverAnalytics,
        hasAnalyticsData: !!analyticsData,
        hasRecommendations: recommendations.length > 0,
        serverAnalyticsKeys: serverAnalytics ? Object.keys(serverAnalytics) : [],
        analyticsDataType: typeof analyticsData,
        analyticsDataKeys: analyticsData ? Object.keys(analyticsData) : []
      });
    }
  }, [isLoading, error, serverAnalytics, analyticsData, recommendations]);


  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-48 lg:col-span-2"></div>
          <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-48"></div>
        </div>
        <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-64"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <TargetIcon className="w-12 h-12 text-red-300 dark:text-red-400 mx-auto mb-4" />
        <h3 className="font-medium text-gray-900 dark:text-white mb-2">Failed to load analytics</h3>
        <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
        <Button onClick={refetch}>Try Again</Button>
      </div>
    );
  }

  // No analytics data - show appropriate message
  // Check if we have any meaningful analytics data, not just if analyticsData exists
  const hasValidAnalytics = analyticsData && (
    (analyticsData.averageImpactScore > 0) ||
    (analyticsData.monthlyStats && analyticsData.monthlyStats.eventsAttended > 0) ||
    (analyticsData.skillsGrowth && analyticsData.skillsGrowth.length > 0) ||
    (analyticsData.careerGoalProgress && analyticsData.careerGoalProgress.progress > 0)
  );

  if (!hasValidAnalytics) {
    const hasCompletedOnboarding = userProfile ? CareerProfileService.hasCompletedOnboarding(userProfile) : false;
    
    if (!hasCompletedOnboarding) {
      return (
        <div className="text-center py-12">
          <TargetIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">No career analytics available</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">Complete your career profile to see personalized insights.</p>
          <Button asChild><Link href={NavigationUtils.goToSettings('career')}>Complete Profile</Link></Button>
        </div>
      );
    }

    // If we have an error, show it instead of infinite loading
    if (error) {
      return (
        <div className="text-center py-12">
          <TargetIcon className="w-12 h-12 text-red-300 dark:text-red-400 mx-auto mb-4" />
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">Failed to load analytics</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
          <Button onClick={refetch}>Try Again</Button>
        </div>
      );
    }

    // Only show loading if we're actually loading and have no error
    if (isLoading && !hasTimedOut) {
      return (
        <div className="text-center py-12">
          <div className="inline-flex items-center gap-3 text-gray-500 dark:text-gray-400">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-lg">Generating personalized career insights...</span>
          </div>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            This may take a moment while we analyze your profile and event history
          </p>
        </div>
      );
    }

    // If we've timed out, show timeout message with helpful actions
    if (hasTimedOut) {
      return (
        <div className="text-center py-12">
          <TargetIcon className="w-12 h-12 text-yellow-300 dark:text-yellow-400 mx-auto mb-4" />
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">Analytics taking longer than expected</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            The analysis is taking longer than usual. This might be due to high server load or complex data processing.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => { setHasTimedOut(false); refetch(); }} variant="outline">
              Try Again
            </Button>
            <Button asChild>
              <Link href={NavigationUtils.goToCalendar()}>Browse Events Instead</Link>
            </Button>
          </div>
        </div>
      );
    }

    // If not loading and no error, but no data, show basic insights with helpful actions
    return (
      <div className="space-y-6">
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <TargetIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">No Analytics Data Available</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            We need more data to generate personalized insights. Try tracking some events or completing your profile.
          </p>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Debug info: {analyticsData ? 'Analytics data exists but has no meaningful values' : 'No analytics data received'}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild variant="outline">
              <Link href={NavigationUtils.goToCalendar()}>Browse Events</Link>
            </Button>
            <Button asChild>
              <Link href={NavigationUtils.goToSettings('career')}>Complete Profile</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show analytics when available
  return (
    <div className="space-y-6">
      {analyticsData && (
        <CareerAnalyticsCard analyticsData={analyticsData} />
      )}
      
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CareerInsightsCard 
            topOpportunities={analyticsData?.upcomingOpportunities || []}
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
              onAction: () => router.push(NavigationUtils.goToSettings('career'))
            },
            {
              id: 'browse-events',
              title: 'Explore Events',
              description: 'Find events matching your interests',
              actionText: 'Browse',
              priority: 'medium' as const,
              onAction: () => router.push(NavigationUtils.goToCalendar())
            }
          ]} />
        </div>
      </div>
      
      {recommendations.length > 0 && (
        <CareerRecommendationsCard
          recommendations={recommendations}
          userProfile={userProfile}
          onEventSelect={(event) => router.push(NavigationUtils.goToEvent(event.id))}
          onRecommendationAction={(rec) => console.log('Action for recommendation:', rec)}
        />
      )}
    </div>
  );
}
