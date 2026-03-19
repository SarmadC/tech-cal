'use client';

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { SectionErrorBoundary, PageErrorBoundary } from '@/components/common/ErrorBoundary';
import CareerProfilePrompt from '@/components/calendar/mobile/CareerProfilePrompt';
import { DashboardErrorState } from '@/components/dashboard/DashboardErrorState';
import { RecentWinsCard } from '@/components/dashboard/RecentWinsCard';
import { CareerImpactInsightsCard } from '@/components/dashboard/CareerImpactInsightsCard';
import { CareerOutcomesCard } from '@/components/dashboard/CareerOutcomesCard';
import UnifiedMobileNavbar from '@/components/common/UnifiedMobileNavbar';
import MobileBottomNav from '@/components/common/MobileBottomNav';
import { APP_MOBILE_NAV_ITEMS } from '@/constants/navigation';
import { useCareerMetrics } from '@/hooks/useCareerMetrics';
import type { AppProfile, CareerProfile, EventType, Event, TrackedEventRecord } from '@/types';
import { MobileMonthlyPulseCard } from './MobileMonthlyPulseCard';
import { MobileInsightCharts } from './MobileInsightCharts';
import { MobileTopRecommendationCard } from './MobileTopRecommendationCard';
import { MobileUpcomingEventsCard } from './MobileUpcomingEventsCard';

const MobileEventDetailPanel = dynamic(
    () => import('@/components/calendar/mobile/MobileEventDetailPanel'),
    { ssr: false }
);

type MobileDashboardState = 'loading' | 'error' | 'ready';

interface MobileDashboardViewProps {
    state: MobileDashboardState;
    profile?: AppProfile | null;
    hasCompletedOnboarding?: boolean;
    careerProfile?: CareerProfile | null;
    trackedEvents?: TrackedEventRecord[];
    allUpcomingEvents?: Event[];
    initialEventTypes?: EventType[];
    attendancePrompt?: ReactNode;
}

export default function MobileDashboardView({
    state,
    profile = null,
    hasCompletedOnboarding = false,
    careerProfile = null,
    trackedEvents = [],
    allUpcomingEvents = [],
    initialEventTypes = [],
    attendancePrompt = null,
}: MobileDashboardViewProps) {
    const compactNumberFormatter = useMemo(
        () => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }),
        []
    );
    const wholeNumberFormatter = useMemo(
        () => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }),
        []
    );
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const summaryMetrics = useCareerMetrics(allUpcomingEvents, trackedEvents);

    const trendMaxValue = useMemo(
        () => Math.max(...summaryMetrics.attendance.trendData.map((item) => item.value), 0),
        [summaryMetrics.attendance.trendData]
    );
    const formatCount = useCallback((value: number) => {
        if (value >= 1000) return compactNumberFormatter.format(value);
        return wholeNumberFormatter.format(value);
    }, [compactNumberFormatter, wholeNumberFormatter]);
    const monthlyDeltaLabel = useMemo(() => {
        const deltaPrefix = summaryMetrics.attendance.deltaAbs >= 0 ? '+' : '';
        const absoluteDelta = `${deltaPrefix}${formatCount(summaryMetrics.attendance.deltaAbs)} vs prev 30d`;

        if (summaryMetrics.attendance.isLowSample || summaryMetrics.attendance.deltaPct === null) {
            return absoluteDelta;
        }

        const percentPrefix = summaryMetrics.attendance.deltaPct >= 0 ? '+' : '';
        return `${percentPrefix}${wholeNumberFormatter.format(summaryMetrics.attendance.deltaPct)}% vs prev 30d`;
    }, [summaryMetrics.attendance.deltaAbs, summaryMetrics.attendance.deltaPct, summaryMetrics.attendance.isLowSample, formatCount, wholeNumberFormatter]);
    const pipelineChartData = useMemo(
        () => summaryMetrics.pipeline.topEvents.map((event) => ({
            name: event.title.length > 14 ? `${event.title.slice(0, 13)}…` : event.title,
            value: event.score,
        })),
        [summaryMetrics.pipeline.topEvents]
    );
    const funnelData = useMemo(
        () => ([
            { name: 'Saved', value: summaryMetrics.funnel90d.savedOnly },
            { name: 'RSVP', value: summaryMetrics.funnel90d.rsvped },
            { name: 'Attended', value: summaryMetrics.funnel90d.attended },
        ]),
        [summaryMetrics.funnel90d.attended, summaryMetrics.funnel90d.rsvped, summaryMetrics.funnel90d.savedOnly]
    );
    const funnelTotal = summaryMetrics.funnel90d.savedOnly + summaryMetrics.funnel90d.rsvped + summaryMetrics.funnel90d.attended;

    return (
        <>
            <UnifiedMobileNavbar
                navItems={APP_MOBILE_NAV_ITEMS}
                fixed={true}
                variant="app"
            />

            <div className="mobile-dashboard-page pb-28 pt-20">
                {state === 'loading' && (
                    <div className="mobile-dashboard-stack pt-0">
                        <div className="mobile-dashboard-card mobile-dashboard-skeletonCard">
                            <div className="mb-2 h-4 w-28 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                            <div className="h-8 w-44 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                        </div>
                        {[1, 2, 3].map((item) => (
                            <div key={item} className="mobile-dashboard-card mobile-dashboard-skeletonCard animate-pulse" />
                        ))}
                    </div>
                )}

                {state === 'error' && (
                    <div className="mobile-dashboard-stack pt-0">
                        <DashboardErrorState
                            title="Failed to load dashboard data"
                            message="There was an error loading your dashboard. Please try refreshing the page."
                            showRefresh={true}
                        />
                    </div>
                )}

                {state === 'ready' && (
                    <>
                        <h1 className="sr-only">Dashboard</h1>
                        <PageErrorBoundary name="DashboardMobile">
                            <div className="mobile-dashboard-stack">
                                {profile && !hasCompletedOnboarding && (
                                    <SectionErrorBoundary name="CareerProfilePromptMobile">
                                        <CareerProfilePrompt profile={profile} />
                                    </SectionErrorBoundary>
                                )}

                                {careerProfile && hasCompletedOnboarding && (
                                    <SectionErrorBoundary name="TopRecommendationCardMobile">
                                        <MobileTopRecommendationCard
                                            trackedEvents={trackedEvents}
                                            upcomingEvents={allUpcomingEvents}
                                            careerProfile={careerProfile}
                                            onSelectEvent={setSelectedEvent}
                                        />
                                    </SectionErrorBoundary>
                                )}

                                <SectionErrorBoundary name="UpcomingEventsCardMobile">
                                    <MobileUpcomingEventsCard
                                        trackedEvents={trackedEvents}
                                        upcomingEvents={allUpcomingEvents}
                                        careerProfile={careerProfile}
                                        onSelectEvent={setSelectedEvent}
                                    />
                                </SectionErrorBoundary>

                                <MobileInsightCharts
                                    funnelData={funnelData}
                                    funnelAttendedCount={summaryMetrics.funnel90d.attended}
                                    funnelTotal={funnelTotal}
                                    pipelineAvgScore={summaryMetrics.pipeline.avgScore}
                                    pipelineTrackedCount={summaryMetrics.pipeline.trackedUpcomingCount}
                                    pipelineScoredCount={summaryMetrics.pipeline.scoredUpcomingCount}
                                    pipelineHighQualityCount={summaryMetrics.pipeline.highFitCount}
                                    pipelineData={pipelineChartData}
                                />

                                <section>
                                    <MobileMonthlyPulseCard
                                        currentMonthAttendance={summaryMetrics.attendance.last30dCount}
                                        deltaLabel={monthlyDeltaLabel}
                                        trendData={summaryMetrics.attendance.trendData}
                                        trendMaxValue={trendMaxValue}
                                        formatCount={formatCount}
                                    />
                                </section>

                                {careerProfile && hasCompletedOnboarding && (
                                    <SectionErrorBoundary name="CareerImpactInsightsCardMobile">
                                        <CareerImpactInsightsCard
                                            trackedEvents={trackedEvents}
                                            careerProfile={careerProfile}
                                            presentation="mobile-dashboard"
                                        />
                                    </SectionErrorBoundary>
                                )}

                                <SectionErrorBoundary name="RecentWinsCardMobile">
                                    <RecentWinsCard
                                        trackedEvents={trackedEvents}
                                        upcomingEvents={allUpcomingEvents}
                                        careerProfile={careerProfile}
                                        eventTypes={initialEventTypes}
                                        presentation="mobile-dashboard"
                                    />
                                </SectionErrorBoundary>

                                <SectionErrorBoundary name="CareerOutcomesCardMobile">
                                    <CareerOutcomesCard
                                        trackedEvents={trackedEvents}
                                        userId={profile?.id}
                                        presentation="mobile-dashboard"
                                    />
                                </SectionErrorBoundary>

                            </div>
                        </PageErrorBoundary>
                    </>
                )}
            </div>

            {selectedEvent && (
                <MobileEventDetailPanel
                    event={selectedEvent}
                    onClose={() => setSelectedEvent(null)}
                    categories={initialEventTypes}
                />
            )}

            <MobileBottomNav />
            {attendancePrompt}
        </>
    );
}
