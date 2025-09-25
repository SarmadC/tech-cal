'use client';

import React from 'react';
// import { CareerProfileService } from '@/services/careerProfileService'; // Not used in simplified version
import { ProgressiveAnalytics } from '@/components/dashboard/ProgressiveAnalytics';
import type { DashboardAnalyticsProps } from '@/types/componentProps';

type CareerAnalyticsSectionProps = DashboardAnalyticsProps;

export function CareerAnalyticsSection({
  userProfile,
  trackedEvents,
  events
}: CareerAnalyticsSectionProps) {
  // Use progressive analytics for better user experience
  return (
    <ProgressiveAnalytics
      userProfile={userProfile}
      trackedEvents={trackedEvents}
      upcomingEvents={events}
    />
  );
}