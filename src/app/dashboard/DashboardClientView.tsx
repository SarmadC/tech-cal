'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { EventService } from '@/services/eventServices';
import { EventTypeService } from '@/services/eventTypeService';
import { useSupabaseSafe } from '@/components/providers/SupabaseProvider';
// Removed unused Card imports
import { Button } from '@/components/ui/button';
import { TargetIcon, SparkleIcon, PlusIcon } from '@phosphor-icons/react';
// 1. UPDATE IMPORTS: Use the new, canonical type names.
import React from 'react';
import { SectionErrorBoundary, PageErrorBoundary } from '@/components/common/ErrorBoundary';
import type { TrackedEventRecord, EventType, Event, AppProfile } from '@/types';
// Removed unused ErrorBoundary import
import CareerProfilePrompt from '@/components/calendar/mobile/discovery/CareerProfilePrompt';
import { CareerProfileService } from '@/services/careerProfileService';
import { CareerAnalyticsCard } from '@/components/dashboard/CareerAnalyticsCard';
import { CareerInsightsCard } from '@/components/dashboard/CareerInsightsCard';
import { EventList } from '@/components/dashboard/EventList';
import { OverviewPanel } from '@/components/dashboard/OverviewPanel';
import { QuickActions } from '@/components/dashboard/QuickActions';
// Removed unused DashboardCard import
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { type CareerAnalyticsData, type CareerRecommendation } from '@/services/careerAnalyticsService';
import { CareerRecommendationsCard, QuickCareerActionsCard } from '@/components/dashboard/CareerRecommendationsCard';
import { useServerSideAnalytics } from '@/hooks/useServerSideAnalytics';
import { useLightweightTrackedEvents } from '@/hooks/useTrackedEventsUnified';

// 2. UPDATE PROPS: The interface now uses the new types.
interface DashboardClientViewProps {
    initialTrackedEvents: TrackedEventRecord[];
    initialEventTypes: EventType[];
    initialUpcomingEvents: Event[];
}


// Removed SectionFallback - using ErrorBoundary's built-in fallback

/**
 * Career Analytics Section - simplified and focused
 */
function CareerAnalyticsSection({
  userProfile,
  trackedEvents,
  upcomingEvents
}: {
  userProfile: AppProfile;
  trackedEvents: TrackedEventRecord[];
  upcomingEvents: Event[];
}) {
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

  // Debug logging to help identify issues
  React.useEffect(() => {
    if (error) {
      console.error('Analytics error:', error);
    }
    if (serverAnalytics) {
      console.log('Analytics data received:', { 
        hasAnalytics: !!analyticsData, 
        hasRecommendations: recommendations.length > 0,
        stats: serverAnalytics.stats 
      });
    }
  }, [error, serverAnalytics, analyticsData, recommendations]);

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
  if (!analyticsData) {
    const hasCompletedOnboarding = userProfile ? CareerProfileService.hasCompletedOnboarding(userProfile) : false;
    
    if (!hasCompletedOnboarding) {
      return (
        <div className="text-center py-12">
          <TargetIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">No career analytics available</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">Complete your career profile to see personalized insights.</p>
          <Button asChild><Link href="/onboarding/career">Complete Profile</Link></Button>
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
              <Link href="/calendar">Browse Events Instead</Link>
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
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild variant="outline">
              <Link href="/calendar">Browse Events</Link>
            </Button>
            <Button asChild>
              <Link href="/onboarding/career">Complete Profile</Link>
            </Button>
          </div>
        </div>
        
        {/* Show basic event information as fallback */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Your Events</h4>
            <p className="text-sm text-blue-600 dark:text-blue-300">
              {trackedEvents.length} tracked events
            </p>
            {trackedEvents.length === 0 && (
              <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                Start tracking events to see analytics
              </p>
            )}
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">Upcoming</h4>
            <p className="text-sm text-green-600 dark:text-green-300">
              {upcomingEvents.length} upcoming events
            </p>
            {upcomingEvents.length === 0 && (
              <p className="text-xs text-green-500 dark:text-green-400 mt-1">
                No upcoming events found
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show analytics when available
  return (
    <div className="space-y-6">
      <CareerAnalyticsCard analyticsData={analyticsData} />
      
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CareerInsightsCard 
            topOpportunities={analyticsData.upcomingOpportunities || []}
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
              onAction: () => window.location.href = '/onboarding/career'
            },
            {
              id: 'browse-events',
              title: 'Explore Events',
              description: 'Find events matching your interests',
              actionText: 'Browse',
              priority: 'medium' as const,
              onAction: () => window.location.href = '/calendar'
            }
          ]} />
        </div>
      </div>
      
      {recommendations.length > 0 && (
        <CareerRecommendationsCard
          recommendations={recommendations}
          userProfile={userProfile}
          onEventSelect={(event) => window.location.href = `/events/${event.id}`}
          onRecommendationAction={(rec) => console.log('Action for recommendation:', rec)}
        />
      )}
    </div>
  );
}

export default function DashboardClientView({
    initialTrackedEvents: _initialTrackedEvents,
    initialEventTypes: _initialEventTypes,
    initialUpcomingEvents: _initialUpcomingEvents
}: DashboardClientViewProps) {
    const { user: _user, profile } = useAuth();
    const { supabase, isReady } = useSupabaseSafe();

    // All hooks must be called before any early returns
    const { data: trackedEvents, isLoading: _trackedEventsLoading } = useLightweightTrackedEvents();
    
    const { data: _eventTypes } = useQuery({
        queryKey: ['eventTypes'],
        queryFn: () => EventTypeService.getEventTypes(supabase!),
        enabled: !!supabase,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    const { data: allUpcomingEvents } = useQuery({
        queryKey: ['allUpcomingEvents'],
        queryFn: () => EventService.getEvents({ startDate: new Date() }, supabase!, 1, 100),
        enabled: !!supabase,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        staleTime: 2 * 60 * 1000, // 2 minutes (events change more frequently)
    });

    const nextTrackedEvents = useMemo(() => {
        if (!trackedEvents || !allUpcomingEvents) return [];
        return trackedEvents
            .map(te => allUpcomingEvents.find(e => e.id === te.eventId))
            .filter((event): event is Event => event !== undefined)
            .slice(0, 5);
    }, [trackedEvents, allUpcomingEvents]);

    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        const name = profile?.fullName?.split(' ')[0] || 'there';
        if (hour < 12) return `Good morning, ${name}!`;
        if (hour < 17) return `Good afternoon, ${name}!`;
        return `Good evening, ${name}!`;
    }, [profile]);

    // Wait for Supabase client to be ready
    if (!isReady || !supabase) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    // Duplicate hooks removed - already defined above

    // Error handling simplified - using the hooks defined above

    // Duplicate nextTrackedEvents removed - already defined above


    // Show loading if supabase client is not ready yet
    if (!supabase) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }


    return (
        <PageErrorBoundary name="Dashboard">
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
                <div className="max-w-7xl mx-auto p-6 space-y-8">
                <SectionErrorBoundary name="DashboardSection">
                    <div className="flex flex-col md:flex-row md:items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">{greeting}</h1>
                            <p className="text-lg text-gray-600 dark:text-gray-300 flex items-center gap-2">
                                <SparkleIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                Ready to discover what is happening in tech today?
                            </p>
                        </div>
                        <div className="flex gap-3 mt-4 md:mt-0">
                            <Button asChild><Link href="/calendar"><PlusIcon className="w-4 h-4 mr-2" />Track Events</Link></Button>
                        </div>
                    </div>
                </SectionErrorBoundary>

                {/* Career Profile Prompt */}
                {profile && !CareerProfileService.hasCompletedOnboarding(profile) && (
                    <SectionErrorBoundary name="DashboardSection">
                        <CareerProfilePrompt profile={profile} />
                    </SectionErrorBoundary>
                )}

                {/* Overview Panel - Consolidated metrics and insights */}
                <SectionErrorBoundary name="DashboardSection">
                    <OverviewPanel 
                        allEvents={allUpcomingEvents || []}
                        trackedEvents={trackedEvents || []}
                    />
                </SectionErrorBoundary>

                {/* Career Analytics - Show if user has completed career profile */}
                {profile && CareerProfileService.hasCompletedOnboarding(profile) && (
                    <SectionErrorBoundary name="DashboardSection">
                        <CareerAnalyticsSection 
                            userProfile={profile}
                            trackedEvents={trackedEvents || []}
                            upcomingEvents={allUpcomingEvents || []}
                        />
                    </SectionErrorBoundary>
                )}

                {/* Quick Actions */}
                <SectionErrorBoundary name="DashboardSection">
                    <QuickActions className="mb-8" />
                </SectionErrorBoundary>

                {/* Activity Feed and Upcoming Events */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                        <SectionErrorBoundary name="DashboardSection">
                            <ActivityFeed 
                                events={allUpcomingEvents || []}
                                trackedEvents={trackedEvents || []}
                            />
                        </SectionErrorBoundary>
                    </div>
                    <div className="lg:col-span-2">
                        <SectionErrorBoundary name="DashboardSection">
                            <EventList
                                events={nextTrackedEvents}
                                title="Your Upcoming Events"
                                description="Events you are tracking."
                                emptyTitle="No upcoming events"
                                emptyDescription="Start tracking events to see them here."
                                emptyActionText="Browse Events"
                                emptyActionHref="/calendar"
                                variant="upcoming"
                            />
                        </SectionErrorBoundary>
                    </div>
                </div>

            </div>
        </div>
        </PageErrorBoundary>
    );
}