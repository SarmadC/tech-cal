import React from 'react';
import { Badge } from '@/components/ui/badge';
import { DashboardCard } from './DashboardCard';
import { CalendarIcon, StarIcon } from '@phosphor-icons/react';
import { formatDistanceToNow } from 'date-fns';
import type { Event, TrackedEventRecord } from '@/types';

interface ActivityItem {
  id: string;
  type: 'tracked' | 'completed' | 'discovered' | 'upcoming';
  title: string;
  description: string;
  timestamp: Date;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}

interface ActivityFeedProps {
  events: Event[];
  trackedEvents: TrackedEventRecord[];
  className?: string;
}

/**
 * Visual activity feed showing recent user actions and upcoming events
 */
export function ActivityFeed({ events, trackedEvents, className = '' }: ActivityFeedProps) {
  // Generate activity items from recent events and tracked events
  const generateActivityItems = (): ActivityItem[] => {
    const items: ActivityItem[] = [];
    const now = new Date();
    
    // Recent tracked events (last 7 days)
    const recentTracked = trackedEvents
      .filter(te => {
        const trackedDate = new Date(te.trackedAt);
        return trackedDate > new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      })
      .slice(0, 3)
      .map(te => ({
        id: `tracked-${te.trackingId}`,
        type: 'tracked' as const,
        title: 'Event Tracked',
        description: te.event?.title || 'Unknown Event',
        timestamp: new Date(te.trackedAt),
        icon: StarIcon,
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900/30'
      }));

    // Upcoming events (next 7 days)
    const upcoming = events
      .filter(event => {
        const eventDate = new Date(event.startTime);
        return eventDate > now && eventDate < new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      })
      .slice(0, 3)
      .map(event => ({
        id: `upcoming-${event.id}`,
        type: 'upcoming' as const,
        title: 'Upcoming Event',
        description: event.title,
        timestamp: new Date(event.startTime),
        icon: CalendarIcon,
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30'
      }));

    items.push(...recentTracked, ...upcoming);
    
    // Sort by timestamp (most recent first)
    return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 6);
  };

  const activityItems = generateActivityItems();

  if (activityItems.length === 0) {
    return (
      <DashboardCard 
        title="Recent Activity" 
        icon={CalendarIcon}
        className={className}
      >
        <div className="text-center py-8">
          <CalendarIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">No recent activity</h3>
          <p className="text-gray-600 dark:text-gray-300">
            Start tracking events to see your activity here
          </p>
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard 
      title="Recent Activity" 
      icon={CalendarIcon}
      className={className}
    >
        <div className="space-y-4">
          {activityItems.map((item, index) => (
            <div key={item.id} className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${item.bgColor} flex-shrink-0`}>
                <item.icon className={`w-4 h-4 ${item.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {item.title}
                  </p>
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${item.color} ${item.bgColor} border-0`}
                  >
                    {item.type}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                  {item.description}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                </p>
              </div>
              {index < activityItems.length - 1 && (
                <div className="absolute left-6 top-12 w-0.5 h-8 bg-gray-200 dark:bg-gray-700" />
              )}
            </div>
          ))}
        </div>
    </DashboardCard>
  );
}
