import { format, subDays, isAfter } from 'date-fns';
import type { Event, TrackedEventRecord } from '@/types';

export interface ChartDataPoint {
  name: string;
  value: number;
  date?: Date;
}

// Generate trend data for the past N days
export function generateTrendData(events: Event[], days: number = 30): ChartDataPoint[] {
  const today = new Date();
  const data: ChartDataPoint[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(today, i);
    const dayEvents = events.filter(event => {
      const eventDate = new Date(event.startTime);
      return eventDate.toDateString() === date.toDateString();
    });

    // Only add points for recent days to avoid cluttered x-axis
    if (i < 7 || dayEvents.length > 0) {
      data.push({
        name: format(date, 'MMM dd'),
        value: dayEvents.length,
        date
      });
    }
  }

  return data;
}

// Generate event type distribution
export function generateTypeDistribution(events: Event[]): ChartDataPoint[] {
  const typeCount: { [key: string]: number } = {};

  events.forEach(event => {
    const type = event.eventTypeId || 'Conference';
    typeCount[type] = (typeCount[type] || 0) + 1;
  });

  return Object.entries(typeCount)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6); // Top 6 types to avoid overcrowding
}

// Generate event status distribution from tracked events
export function generateStatusDistribution(trackedEvents: TrackedEventRecord[]): ChartDataPoint[] {
  const statusCount: { [key: string]: number } = {};

  trackedEvents.forEach(te => {
    // Count by attendance status (bookmarking is separate)
    if (te.status) {
      const displayName = te.status.charAt(0).toUpperCase() + te.status.slice(1);
      statusCount[displayName] = (statusCount[displayName] || 0) + 1;
    }
    // Also count bookmarks separately if no status
    if (te.isBookmarked && !te.status) {
      statusCount['Bookmarked'] = (statusCount['Bookmarked'] || 0) + 1;
    }
  });

  return Object.entries(statusCount)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

// Get upcoming vs past events breakdown
export function generateTimeDistribution(events: Event[]): ChartDataPoint[] {
  const now = new Date();
  let upcoming = 0;
  let past = 0;

  events.forEach(event => {
    const eventDate = new Date(event.startTime);
    if (isAfter(eventDate, now)) {
      upcoming++;
    } else {
      past++;
    }
  });

  return [
    { name: 'Upcoming', value: upcoming },
    { name: 'Past', value: past }
  ].filter(item => item.value > 0);
}