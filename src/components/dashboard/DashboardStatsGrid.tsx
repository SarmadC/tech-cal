'use client';

import { SectionErrorBoundary } from '@/components/common/ErrorBoundary';
import { QuickStatsCard } from '@/components/dashboard/QuickStatsCard';
import { ActivityTrendCard } from '@/components/dashboard/ActivityTrendCard';
import { EventHeatMap } from '@/components/dashboard/EventHeatMap';
import { EventDistributionCard } from '@/components/dashboard/EventDistributionCard';
import { DashboardErrorState } from '@/components/dashboard/DashboardErrorState';
import type { TrackedEventRecord, Event } from '@/types';

interface DashboardStatsGridProps {
  allUpcomingEvents: Event[];
  trackedEvents: TrackedEventRecord[];
}

export function DashboardStatsGrid({ allUpcomingEvents, trackedEvents }: DashboardStatsGridProps) {
  // Validate data before rendering
  if (!allUpcomingEvents || !trackedEvents) {
    return (
      <DashboardErrorState
        title="Data not available"
        message="Unable to load dashboard statistics. Please try refreshing the page."
        showRefresh={true}
      />
    );
  }

  return (
    <>
      {/* Dashboard Analytics */}
      <SectionErrorBoundary 
        name="QuickStatsCard"
        fallback={
          <DashboardErrorState
            title="Failed to load statistics"
            message="Unable to load your dashboard overview. Please try again."
            onRetry={() => window.location.reload()}
          />
        }
      >
        <QuickStatsCard
          events={allUpcomingEvents}
          trackedEvents={trackedEvents}
        />
      </SectionErrorBoundary>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <SectionErrorBoundary 
          name="ActivityTrendCard"
          fallback={
            <div className="col-span-1">
              <DashboardErrorState
                title="Activity trend unavailable"
                message="Unable to load your activity trends."
                onRetry={() => window.location.reload()}
              />
            </div>
          }
        >
          <ActivityTrendCard
            trackedEvents={trackedEvents}
          />
        </SectionErrorBoundary>
        
        <SectionErrorBoundary 
          name="EventHeatMap"
          fallback={
            <div className="col-span-1">
              <DashboardErrorState
                title="Event heatmap unavailable"
                message="Unable to load the event heatmap."
                onRetry={() => window.location.reload()}
              />
            </div>
          }
        >
          <EventHeatMap
            events={allUpcomingEvents}
          />
        </SectionErrorBoundary>
        
        <SectionErrorBoundary 
          name="EventDistributionCard"
          fallback={
            <div className="col-span-1">
              <DashboardErrorState
                title="Event distribution unavailable"
                message="Unable to load event distribution data."
                onRetry={() => window.location.reload()}
              />
            </div>
          }
        >
          <EventDistributionCard
            events={allUpcomingEvents}
          />
        </SectionErrorBoundary>
      </div>
    </>
  );
}
