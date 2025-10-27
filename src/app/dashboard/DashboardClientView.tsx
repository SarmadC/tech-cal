'use client';

import { useAuth } from '@/contexts/AuthContext';
import { SectionErrorBoundary, PageErrorBoundary } from '@/components/common/ErrorBoundary';
import CareerProfilePrompt from '@/components/calendar/mobile/discovery/CareerProfilePrompt';
import { useCareerProfile } from '@/hooks/useCareerProfile';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardErrorState } from '@/components/dashboard/DashboardErrorState';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import { QuickKPIsStrip } from '@/components/dashboard/QuickKPIsStrip';
import { ImpactTimeline } from '@/components/dashboard/ImpactTimeline';
import { EventTypeDistribution } from '@/components/dashboard/EventTypeDistribution';
import { CareerProgressHero } from '@/components/dashboard/CareerProgressHero';
import { CareerGoalsTracker } from '@/components/dashboard/CareerGoalsTracker';
import { CareerGoalProgressChart } from '@/components/dashboard/CareerGoalProgressChart';
import { SkillsDevelopmentCard } from '@/components/dashboard/SkillsDevelopmentCard';
import { CareerAlignedEventsCard } from '@/components/dashboard/CareerAlignedEventsCard';
import { UpcomingEventsNextSteps } from '@/components/dashboard/UpcomingEventsNextSteps';
import { NetworkingProgressCard } from '@/components/dashboard/NetworkingProgressCard';
import { useDashboardData } from '@/hooks/useDashboardData';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from '@/components/app-sidebar';
import Navbar from '@/components/common/Navbar';
import MobileNavbar from '@/components/common/MobileNavbar';
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
    const { careerProfile, hasCompletedOnboarding } = useCareerProfile();
    const {
        trackedEvents,
        allUpcomingEvents,
        isLoading,
        isReady,
        errors
    } = useDashboardData({
        initialEventTypes,
        initialUpcomingEvents,
        initialTrackedEvents
    });

    // Wait for data to be ready
    if (!isReady || isLoading) {
        return (
            <SidebarProvider>
                <div className="flex h-screen" style={{ background: 'hsl(var(--background))' }}>
                    <AppSidebar />
                    <main className="flex-1 flex flex-col overflow-hidden">
                        <div className="flex-1 overflow-auto">
                            <div className="flex items-center justify-center min-h-[400px]">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                                    <p className="text-muted-foreground">Loading dashboard...</p>
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </SidebarProvider>
        );
    }

    // Handle critical errors
    const hasCriticalErrors = errors.trackedEvents || errors.eventTypes || errors.upcomingEvents;
    if (hasCriticalErrors) {
        return (
            <SidebarProvider>
                <div className="flex h-screen" style={{ background: 'hsl(var(--background))' }}>
                    <AppSidebar />
                    <main className="flex-1 flex flex-col overflow-hidden">
                        <div className="flex-1 overflow-auto">
                            <DashboardErrorState
                                title="Failed to load dashboard data"
                                message="There was an error loading your dashboard. Please try refreshing the page."
                                showRefresh={true}
                            />
                        </div>
                    </main>
                </div>
            </SidebarProvider>
        );
    }


    return (
        <SidebarProvider>
            {/* Mobile Navigation - Only visible on mobile */}
            <MobileNavbar />
            <div className="flex h-screen bg-background">
                <AppSidebar />
                <main className="flex-1 flex flex-col overflow-hidden">
                    {/* Main Navbar - Hidden on mobile */}
                    <Navbar />
                    <div className="flex-1 overflow-auto">
                        <PageErrorBoundary name="Dashboard">
                            {/* Glassmorphic Dashboard with gradient background */}
                            <div className="min-h-screen glass-bg-gradient relative">
                                {/* Subtle atmospheric overlay */}
                                <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/5 to-white/10 dark:from-black/0 dark:via-white/5 dark:to-white/10 pointer-events-none" />
                                
                                <div className="relative max-w-[1600px] mx-auto px-6 py-8 space-y-6">
                                    {/* Breadcrumbs */}
                                    <Breadcrumbs
                                        base={[{ label: 'Home', href: '/' }]}
                                        trail={[{ label: 'Dashboard' }]}
                                    />
                                    {/* Dashboard Header */}
                                    <SectionErrorBoundary name="DashboardHeader">
                                        <DashboardHeader profile={profile} />
                                    </SectionErrorBoundary>

                                    {/* Career Profile Prompt */}
                                    {profile && !hasCompletedOnboarding && (
                                        <SectionErrorBoundary name="CareerProfilePrompt">
                                            <CareerProfilePrompt profile={profile} />
                                        </SectionErrorBoundary>
                                    )}

                                    {/* Hero Section - Career Progress Overview */}
                                    {careerProfile && hasCompletedOnboarding && (
                                        <SectionErrorBoundary name="CareerProgressHero">
                                            <CareerProgressHero
                                                careerProfile={careerProfile}
                                                trackedEvents={trackedEvents}
                                                upcomingEvents={allUpcomingEvents}
                                            />
                                        </SectionErrorBoundary>
                                    )}

                                    {/* Quick KPIs Strip - Full Width */}
                                    <SectionErrorBoundary name="QuickKPIs">
                                        <QuickKPIsStrip 
                                            trackedEvents={trackedEvents} 
                                            careerProfile={careerProfile ?? undefined}
                                        />
                                    </SectionErrorBoundary>

                                    {/* Main Content Grid - 60/40 Split */}
                                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                                        {/* Left Column (60%) - Progress & Analytics */}
                                        <div className="space-y-6 xl:col-span-7">
                                            {/* Career Goal Progress Chart */}
                                            {careerProfile && hasCompletedOnboarding && (
                                                <SectionErrorBoundary name="CareerGoalProgressChart">
                                                    <CareerGoalProgressChart
                                                        careerProfile={careerProfile}
                                                        trackedEvents={trackedEvents}
                                                        upcomingEvents={allUpcomingEvents}
                                                    />
                                                </SectionErrorBoundary>
                                            )}

                                            {/* Career Goals Tracker */}
                                            {careerProfile && hasCompletedOnboarding && (
                                                <SectionErrorBoundary name="CareerGoalsTracker">
                                                    <CareerGoalsTracker
                                                        careerProfile={careerProfile}
                                                        trackedEvents={trackedEvents}
                                                        upcomingEvents={allUpcomingEvents}
                                                    />
                                                </SectionErrorBoundary>
                                            )}

                                            {/* Skills Development */}
                                            {careerProfile && hasCompletedOnboarding && (
                                                <SectionErrorBoundary name="SkillsDevelopmentCard">
                                                    <SkillsDevelopmentCard
                                                        careerProfile={careerProfile}
                                                        upcomingEvents={allUpcomingEvents}
                                                    />
                                                </SectionErrorBoundary>
                                            )}

                                            {/* Impact Timeline */}
                                            <SectionErrorBoundary name="ImpactTimeline">
                                                <ImpactTimeline trackedEvents={trackedEvents} />
                                            </SectionErrorBoundary>
                                        </div>

                                        {/* Right Column (40%) - Actions & Recommendations */}
                                        <div className="space-y-6 xl:col-span-5 xl:sticky xl:top-6 self-start">
                                            {/* Career-Aligned Events */}
                                            {careerProfile && hasCompletedOnboarding && (
                                                <SectionErrorBoundary name="CareerAlignedEventsCard">
                                                    <CareerAlignedEventsCard
                                                        careerProfile={careerProfile}
                                                        upcomingEvents={allUpcomingEvents}
                                                        eventTypes={initialEventTypes}
                                                    />
                                                </SectionErrorBoundary>
                                            )}

                                            {/* Upcoming Events & Next Steps */}
                                            <SectionErrorBoundary name="UpcomingEventsNextSteps">
                                                <UpcomingEventsNextSteps
                                                    trackedEvents={trackedEvents}
                                                    upcomingEvents={allUpcomingEvents}
                                                />
                                            </SectionErrorBoundary>

                                            {/* Networking Progress */}
                                            {careerProfile && hasCompletedOnboarding && careerProfile.networkingGoals.length > 0 && (
                                                <SectionErrorBoundary name="NetworkingProgressCard">
                                                    <NetworkingProgressCard
                                                        careerProfile={careerProfile}
                                                        trackedEvents={trackedEvents}
                                                        upcomingEvents={allUpcomingEvents}
                                                    />
                                                </SectionErrorBoundary>
                                            )}

                                            {/* Event Type Distribution */}
                                            <SectionErrorBoundary name="EventTypeDistribution">
                                                <EventTypeDistribution
                                                    trackedEvents={trackedEvents}
                                                    upcomingEvents={allUpcomingEvents}
                                                />
                                            </SectionErrorBoundary>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </PageErrorBoundary>
                    </div>
                </main>
            </div>
        </SidebarProvider>
    );
}