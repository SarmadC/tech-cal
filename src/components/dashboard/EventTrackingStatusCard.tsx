'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useTimelineTheme } from '@/hooks/useTimelineTheme';
import { CheckCircle, Calendar, Bookmark, XCircle } from '@phosphor-icons/react';
import type { TrackedEventRecord } from '@/types';
import { EVENT_STATUS } from '@/types/events';

interface EventTrackingStatusCardProps {
  trackedEvents: TrackedEventRecord[];
}

export function EventTrackingStatusCard({
  trackedEvents
}: EventTrackingStatusCardProps) {
  const theme = useTimelineTheme();

  // Calculate status breakdown
  const statusBreakdown = useMemo(() => {
    const attended = trackedEvents.filter(e => e.status === EVENT_STATUS.ATTENDED).length;
    const attending = trackedEvents.filter(e => e.status === EVENT_STATUS.ATTENDING).length;
    const bookmarked = trackedEvents.filter(e => e.isBookmarked).length;  // Use isBookmarked instead of status
    const cancelled = trackedEvents.filter(e => e.status === EVENT_STATUS.CANCELLED).length;
    const total = trackedEvents.length;

    return {
      attended,
      attending,
      bookmarked,
      cancelled,
      total,
      attendedPercentage: total > 0 ? Math.round((attended / total) * 100) : 0
    };
  }, [trackedEvents]);

  const statusConfigs = [
    {
      status: 'attended',
      label: 'Attended',
      count: statusBreakdown.attended,
      icon: CheckCircle,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      description: 'Counts toward career progress'
    },
    {
      status: 'attending',
      label: 'Planning to Attend',
      count: statusBreakdown.attending,
      icon: Calendar,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      description: 'Registered or interested'
    },
    {
      status: 'bookmarked',
      label: 'Bookmarked',
      count: statusBreakdown.bookmarked,
      icon: Bookmark,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      description: 'Saved for later'
    },
    {
      status: 'cancelled',
      label: 'Cancelled',
      count: statusBreakdown.cancelled,
      icon: XCircle,
      color: 'text-gray-600 dark:text-gray-400',
      bgColor: 'bg-gray-50 dark:bg-gray-900/20',
      description: 'Did not attend'
    }
  ];

  if (trackedEvents.length === 0) {
    return null; // Don't show if no events tracked
  }

  return (
    <Card className={`border ${theme.borderCard}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className={`text-lg ${theme.textPrimary}`}>Event Tracking Status</CardTitle>
            <CardDescription className={theme.textSecondary}>
              {statusBreakdown.total} events tracked • {statusBreakdown.attended} attended
            </CardDescription>
          </div>
          <Badge variant={statusBreakdown.attendedPercentage >= 50 ? "default" : "secondary"}>
            {statusBreakdown.attendedPercentage}% attended
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Attendance Rate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className={theme.textPrimary}>Attendance Rate</span>
            <span className={theme.textMuted}>
              {statusBreakdown.attended} / {statusBreakdown.total}
            </span>
          </div>
          <Progress value={statusBreakdown.attendedPercentage} className="h-2" />
          <p className={`text-xs ${theme.textMuted}`}>
            Only attended events count toward your career progress
          </p>
        </div>

        {/* Status Breakdown */}
        <div className="grid grid-cols-2 gap-3">
          {statusConfigs.map(config => {
            const Icon = config.icon;
            if (config.count === 0) return null;

            return (
              <div
                key={config.status}
                className={`p-3 rounded-lg ${config.bgColor}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${config.color}`} />
                  <span className={`text-sm font-semibold ${theme.textPrimary}`}>
                    {config.count}
                  </span>
                </div>
                <p className={`text-xs ${theme.textPrimary} font-medium mb-1`}>
                  {config.label}
                </p>
                <p className={`text-xs ${theme.textMuted}`}>
                  {config.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Helpful Tip */}
        {statusBreakdown.attending > 0 && (
          <div className={`p-3 rounded-lg border ${theme.borderCard} bg-blue-50/50 dark:bg-blue-900/10`}>
            <p className={`text-xs ${theme.textPrimary}`}>
              💡 <strong>Tip:</strong> Mark events as &quot;Attended&quot; after you complete them to track your career progress accurately.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
