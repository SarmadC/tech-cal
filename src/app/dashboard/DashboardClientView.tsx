'use client';

import { useAuth } from '@/contexts/AuthContext';
import { SectionErrorBoundary, PageErrorBoundary } from '@/components/common/ErrorBoundary';
import CareerProfilePrompt from '@/components/calendar/mobile/discovery/CareerProfilePrompt';
import { CareerProfileService } from '@/services/careerProfileService';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardStatsGrid } from '@/components/dashboard/DashboardStatsGrid';
import { CareerAnalyticsSection } from '@/components/dashboard/CareerAnalyticsSection';
import { DashboardErrorState } from '@/components/dashboard/DashboardErrorState';
import { DashboardSection } from '@/components/dashboard/DashboardGrid';
import { useDashboardData } from '@/hooks/useDashboardData';
import type { EventType, Event, TrackedEventRecord } from '@/types';

interface DashboardClientViewProps {
    initialEventTypes: EventType[];
    initialUpcomingEvents: Event[];
    initialTrackedEvents: TrackedEventRecord[];
}



export default function DashboardClientView({
    initialEventTypes,
    initialUpcomingEvents,
    initialTrackedEvents
}: DashboardClientViewProps) {
    const { user: _user, profile } = useAuth();
    const { trackedEvents, allUpcomingEvents, isLoading, isReady, errors } = useDashboardData({
        initialEventTypes,
        initialUpcomingEvents,
        initialTrackedEvents
    });

    // Wait for data to be ready
    if (!isReady || isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    // Handle critical errors
    const hasCriticalErrors = errors.trackedEvents || errors.eventTypes || errors.upcomingEvents;
    if (hasCriticalErrors) {
        return (
            <DashboardErrorState
                title="Failed to load dashboard data"
                message="There was an error loading your dashboard. Please try refreshing the page."
                showRefresh={true}
            />
        );
    }


    return (
        <PageErrorBoundary name="Dashboard">
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
                <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-8">
                    {/* Dashboard Header */}
                    <SectionErrorBoundary name="DashboardHeader">
                        <DashboardHeader profile={profile} />
                    </SectionErrorBoundary>

                    {/* Career Profile Prompt */}
                    {profile && !CareerProfileService.hasCompletedOnboarding(profile) && (
                        <SectionErrorBoundary name="CareerProfilePrompt">
                            <CareerProfilePrompt profile={profile} />
                        </SectionErrorBoundary>
                    )}

                    {/* Dashboard Stats Grid */}
                    <DashboardSection>
                        <SectionErrorBoundary name="DashboardStats">
                            <DashboardStatsGrid
                                events={allUpcomingEvents}
                                trackedEvents={trackedEvents}
                            />
                        </SectionErrorBoundary>
                    </DashboardSection>

                    {/* Career Analytics - Show if user has completed career profile */}
                    {profile && CareerProfileService.hasCompletedOnboarding(profile) && (
                        <DashboardSection>
                            <SectionErrorBoundary name="CareerAnalytics">
                                <CareerAnalyticsSection
                                    userProfile={profile}
                                    trackedEvents={trackedEvents}
                                    events={allUpcomingEvents}
                                />
                            </SectionErrorBoundary>
                        </DashboardSection>
                    )}
                </div>
            </div>
        </PageErrorBoundary>
    );
}