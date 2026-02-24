'use client';

import { useAuth } from '@/contexts/AuthContext';
import { SectionErrorBoundary, PageErrorBoundary } from '@/components/common/ErrorBoundary';
import CareerProfilePrompt from '@/components/calendar/mobile/CareerProfilePrompt';
import { useCareerProfile } from '@/hooks/useCareerProfile';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardErrorState } from '@/components/dashboard/DashboardErrorState';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import { CareerOutcomesCard } from '@/components/dashboard/CareerOutcomesCard';
import { FocusHeroCard } from '@/components/dashboard/FocusHeroCard';
import { CareerProgressCard } from '@/components/dashboard/CareerProgressCard';
import { LearningProgressCard } from '@/components/dashboard/LearningProgressCard';
import { PipelineColumn } from '@/components/dashboard/PipelineColumn';
import { RecentWinsCard } from '@/components/dashboard/RecentWinsCard';
import { OverviewPanel } from '@/components/dashboard/OverviewPanel';
import { CareerImpactInsightsCard } from '@/components/dashboard/CareerImpactInsightsCard';
import { CareerAnalyticsSection } from '@/components/dashboard/CareerAnalyticsSection';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { usePastEventAttendancePrompt } from '@/hooks/usePastEventAttendancePrompt';
import dynamic from 'next/dynamic';

// Dynamically import attendance prompt modal to avoid SSR issues
const PastEventAttendancePrompt = dynamic(
    () => import('@/components/dashboard/PastEventAttendancePrompt'),
    { ssr: false }
);
import { SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from '@/components/app-sidebar';
import { APP_MOBILE_NAV_ITEMS } from '@/constants/navigation';
import UnifiedMobileNavbar from '@/components/common/UnifiedMobileNavbar';
import MobileBottomNav from '@/components/common/MobileBottomNav';
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
    const { isMobile } = useDeviceDetection();

    // Past event attendance prompt
    const {
        pendingEvents,
        snoozeEvent,
        markAttended,
        markNotAttended,
        hasPendingPrompts
    } = usePastEventAttendancePrompt();
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
                <div className="flex h-screen bg-gray-50 dark:bg-[#0A0A0A]">
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
                <div className="flex h-screen bg-gray-50 dark:bg-[#0A0A0A]">
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
            {/* Mobile Bottom Navigation - Only visible on mobile */}
            {isMobile && <MobileBottomNav />}
            {/* Conditional Navigation - UnifiedMobileNavbar on mobile, Navbar on desktop */}
            {isMobile ? (
                <UnifiedMobileNavbar
                    navItems={APP_MOBILE_NAV_ITEMS}
                    fixed={false}
                    className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/40"
                />
            ) : null}
            <div className="flex h-screen bg-background">
                <h1 className="sr-only">Dashboard</h1>
                <AppSidebar />
                <main className="flex-1 flex flex-col overflow-hidden relative">
                    <div className="flex-1 overflow-auto">
                        <PageErrorBoundary name="Dashboard">
                            {/* Detailed Grid Dashboard with flat background */}
                            <div className="min-h-screen bg-gray-50 dark:bg-[#0A0A0A] relative">
                                {/* Subtle noise texture or grid could go here, keeping it clean for now */}
                                <div className="absolute inset-0 bg-black/[0.02] dark:bg-white/[0.02] pointer-events-none" />

                                <div className={`relative max-w-[1600px] mx-auto px-6 space-y-6 ${isMobile ? 'pt-20 pb-24' : 'py-8'}`}>
                                    {/* Breadcrumbs - Hidden on mobile */}
                                    {!isMobile && (
                                        <Breadcrumbs
                                            base={[{ label: 'Home', href: '/' }]}
                                            trail={[{ label: 'Dashboard' }]}
                                        />
                                    )}
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

                                    {/* Focus Zone - Hero Card */}
                                    {careerProfile && hasCompletedOnboarding && (
                                        <SectionErrorBoundary name="FocusHeroCard">
                                            <FocusHeroCard
                                                trackedEvents={trackedEvents}
                                                upcomingEvents={allUpcomingEvents}
                                                careerProfile={careerProfile}
                                                eventTypes={initialEventTypes}
                                            />
                                        </SectionErrorBoundary>
                                    )}

                                    {/* Career Overview Metrics */}
                                    {careerProfile && hasCompletedOnboarding && (
                                        <SectionErrorBoundary name="OverviewPanel">
                                            <OverviewPanel
                                                allEvents={allUpcomingEvents}
                                                trackedEvents={trackedEvents}
                                            />
                                        </SectionErrorBoundary>
                                    )}

                                    {/* Main Content Grid - 60/40 Split */}
                                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                                        {/* Left Column (60%) - Progress & Analytics */}
                                        <div className="space-y-6 xl:col-span-7">
                                            {/* Career Progress Card */}
                                            {careerProfile && hasCompletedOnboarding && (
                                                <SectionErrorBoundary name="CareerProgressCard">
                                                    <CareerProgressCard
                                                        trackedEvents={trackedEvents}
                                                        upcomingEvents={allUpcomingEvents}
                                                        careerProfile={careerProfile}
                                                    />
                                                </SectionErrorBoundary>
                                            )}

                                            {/* Learning Progress Card */}
                                            {careerProfile && hasCompletedOnboarding && (
                                                <SectionErrorBoundary name="LearningProgressCard">
                                                    <LearningProgressCard
                                                        trackedEvents={trackedEvents}
                                                        upcomingEvents={allUpcomingEvents}
                                                        careerProfile={careerProfile}
                                                        eventTypes={initialEventTypes}
                                                    />
                                                </SectionErrorBoundary>
                                            )}

                                            {/* Career Impact Insights */}
                                            {careerProfile && hasCompletedOnboarding && (
                                                <SectionErrorBoundary name="CareerImpactInsightsCard">
                                                    <CareerImpactInsightsCard
                                                        trackedEvents={trackedEvents}
                                                        careerProfile={careerProfile}
                                                    />
                                                </SectionErrorBoundary>
                                            )}

                                            {/* Recent Wins Card */}
                                            <SectionErrorBoundary name="RecentWinsCard">
                                                <RecentWinsCard
                                                    trackedEvents={trackedEvents}
                                                    upcomingEvents={allUpcomingEvents}
                                                    careerProfile={careerProfile}
                                                    eventTypes={initialEventTypes}
                                                />
                                            </SectionErrorBoundary>
                                        </div>

                                        {/* Right Column (40%) - Actions & Recommendations */}
                                        <div className="space-y-6 xl:col-span-5">
                                            {/* Pipeline Column */}
                                            {careerProfile && hasCompletedOnboarding && (
                                                <SectionErrorBoundary name="PipelineColumn">
                                                    <PipelineColumn
                                                        trackedEvents={trackedEvents}
                                                        upcomingEvents={allUpcomingEvents}
                                                        careerProfile={careerProfile}
                                                        eventTypes={initialEventTypes}
                                                    />
                                                </SectionErrorBoundary>
                                            )}

                                            {/* Career Outcomes Card */}
                                            <SectionErrorBoundary name="CareerOutcomesCard">
                                                <CareerOutcomesCard
                                                    trackedEvents={trackedEvents}
                                                    userId={profile?.id}
                                                />
                                            </SectionErrorBoundary>
                                        </div>
                                    </div>

                                    {/* Progressive Analytics + Recommendations */}
                                    {profile && hasCompletedOnboarding && (
                                        <SectionErrorBoundary name="CareerAnalyticsSection">
                                            <CareerAnalyticsSection
                                                userProfile={profile}
                                                trackedEvents={trackedEvents}
                                                events={allUpcomingEvents}
                                            />
                                        </SectionErrorBoundary>
                                    )}
                                </div>
                            </div>
                        </PageErrorBoundary>
                    </div>
                </main>
            </div>

            {/* Past Event Attendance Prompt Modal */}
            {hasPendingPrompts && (
                <PastEventAttendancePrompt
                    pendingEvents={pendingEvents}
                    onAttended={markAttended}
                    onNotAttended={markNotAttended}
                    onSnooze={snoozeEvent}
                />
            )}
        </SidebarProvider>
    );
}
