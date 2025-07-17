// src/app/dashboard/growth/page.tsx (Corrected)

'use client';

import { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { supabase } from '@/lib/supabaseClient';

// --- Type Definitions ---
interface UserEvent {
  attendedAt: string;
  category: string;
}

interface ChartData {
  month: string;
  [key: string]: string | number;
}

// Correctly typed to match the actual Supabase response structure
interface SupabaseUserEvent {
  created_at: string;
  events: {
    event_type: {
      name: string;
    } | null;
  }[] | null; // <-- This correctly types 'events' as an array
}


// --- Helper Functions ---

// Fetch user events from Supabase
const fetchUserEvents = async (userId: string): Promise<UserEvent[]> => {
  const { data, error } = await supabase
    .from('user_events')
    .select(`
      created_at,
      events (
        event_type (
          name
        )
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'attended');

  if (error) {
    console.error('Error fetching user events:', error);
    return [];
  }

  // Safely map the data with the corrected type
  return (data as SupabaseUserEvent[]).map((userEvent) => ({
    attendedAt: userEvent.created_at,
    category: userEvent.events?.[0]?.event_type?.name || 'Unknown',
  }));
};

// Get events attended this year
const getEventsThisYear = (events: UserEvent[]) => {
  const currentYear = new Date().getFullYear();
  return events.filter(event => new Date(event.attendedAt).getFullYear() === currentYear);
};

// Calculate stats for the current year
const calculateYearlyStats = (events: UserEvent[]) => {
  const eventsThisYear = getEventsThisYear(events);
  const stats = eventsThisYear.reduce((acc, event) => {
    acc[event.category] = (acc[event.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  return {
    total: eventsThisYear.length,
    byCategory: stats,
  };
};

// Prepare data for the progression chart
const prepareChartData = (events: UserEvent[]): ChartData[] => {
  const monthlyData = events.reduce((acc, event) => {
    const month = new Date(event.attendedAt).toLocaleString('default', { month: 'short', year: 'numeric' });
    if (!acc[month]) {
      acc[month] = {};
    }
    acc[month][event.category] = (acc[month][event.category] || 0) + 1;
    return acc;
  }, {} as Record<string, Record<string, number>>);

  return Object.keys(monthlyData).map(month => ({
    month,
    ...monthlyData[month],
  })).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
};

// Calculate the current attendance streak
const calculateStreak = (events: UserEvent[]) => {
  if (events.length === 0) return 0;

  const sortedEvents = events.map(e => new Date(e.attendedAt)).sort((a, b) => b.getTime() - a.getTime());
  let streak = 0;
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const attendedThisMonth = sortedEvents.some(
    date => date.getMonth() === currentMonth && date.getFullYear() === currentYear
  );

  if (attendedThisMonth) {
    streak++;
    let lastMonth = currentMonth - 1;
    let lastYear = currentYear;

    if (lastMonth < 0) {
      lastMonth = 11;
      lastYear--;
    }

    for (let i = 1; i < 12; i++) {
      const attendedLastMonth = sortedEvents.some(
        date => date.getMonth() === lastMonth && date.getFullYear() === lastYear
      );

      if (attendedLastMonth) {
        streak++;
        lastMonth--;
        if (lastMonth < 0) {
          lastMonth = 11;
          lastYear--;
        }
      } else {
        break;
      }
    }
  }

  return streak;
};

export default function GrowthDashboardPage() {
  const [userEvents, setUserEvents] = useState<UserEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      // NOTE: Replace with actual user ID from your auth session
      const userId = '...';
      try {
        const events = await fetchUserEvents(userId);
        setUserEvents(events);
      } catch (err) {
        setError('Failed to load growth data.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const yearlyStats = useMemo(() => calculateYearlyStats(userEvents), [userEvents]);
  const chartData = useMemo(() => prepareChartData(userEvents), [userEvents]);
  const streak = useMemo(() => calculateStreak(userEvents), [userEvents]);

  const topCategory = Object.entries(yearlyStats.byCategory).sort((a, b) => b[1] - a[1])[0];

  if (loading) {
    return <div className="text-center p-8">Loading your growth data...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-background-main pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground-primary mb-2">
            Your Personal Growth
          </h1>
          <p className="text-foreground-secondary">
            Track your learning journey through tech events.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-background-secondary rounded-xl p-6 border border-border-color">
            <h3 className="text-sm font-medium text-foreground-tertiary">Total Events This Year</h3>
            <p className="text-4xl font-bold text-foreground-primary mt-2">{yearlyStats.total}</p>
          </div>
          <div className="bg-background-secondary rounded-xl p-6 border border-border-color">
            <h3 className="text-sm font-medium text-foreground-tertiary">Top Category This Year</h3>
            <p className="text-4xl font-bold text-accent-primary mt-2">{topCategory ? topCategory[0] : 'N/A'}</p>
            {topCategory && <p className="text-xs text-foreground-tertiary mt-1">{`You've attended ${topCategory[1]} ${topCategory[0]} events this year`}</p>}
          </div>
          <div className="bg-background-secondary rounded-xl p-6 border border-border-color">
            <h3 className="text-sm font-medium text-foreground-tertiary">Monthly Attendance Streak</h3>
            <p className="text-4xl font-bold text-foreground-primary mt-2">{streak} <span className="text-2xl">months</span></p>
          </div>
        </div>

        {/* Category-based Skill Progression */}
        <div className="bg-background-secondary rounded-xl p-6 border border-border-color">
          <h2 className="text-lg font-semibold text-foreground-primary mb-4">
            Category-based Skill Progression
          </h2>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="AI & ML" stackId="a" fill="#8884d8" />
                <Bar dataKey="Web Dev" stackId="a" fill="#82ca9d" />
                <Bar dataKey="Cloud" stackId="a" fill="#ffc658" />
                <Bar dataKey="Security" stackId="a" fill="#ff8042" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}