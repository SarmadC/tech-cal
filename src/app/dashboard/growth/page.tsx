// src/app/dashboard/growth/page.tsx (Fixed)

'use client';

import { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { supabase } from '@/lib/supabaseClient';
import { useUserId } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';

// --- Type Definitions ---
interface UserEvent {
  attendedAt: string;
  category: string;
}

interface ChartData {
  month: string;
  [key: string]: string | number;
}

// FIXED: Corrected type to match actual Supabase response structure
interface SupabaseUserEvent {
  created_at: string;
  events: {
    event_type: {
      name: string;
    }[];
  }[] | null;
}

// --- Helper Functions ---

// FIXED: Updated to handle the actual Supabase response structure
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

  // FIXED: Handle the nested array structure correctly
  return (data as SupabaseUserEvent[])
    .map((userEvent) => ({
      attendedAt: userEvent.created_at,
      // FIXED: Access the nested structure properly
      category: userEvent.events?.[0]?.event_type?.[0]?.name || 'Unknown',
    }))
    .filter(event => event.category !== 'Unknown'); // Filter out events without categories
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
  const userId = useUserId(); // Get user ID from auth context

  useEffect(() => {
    const loadData = async () => {      
      if (!userId) {
        setError('Please sign in to view your growth data.');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const events = await fetchUserEvents(userId);
        setUserEvents(events);
        setError(null);
      } catch (err) {
        setError('Failed to load growth data.');
        console.error('Error loading growth data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [userId]); // Add userId as dependency

  const yearlyStats = useMemo(() => calculateYearlyStats(userEvents), [userEvents]);
  const chartData = useMemo(() => prepareChartData(userEvents), [userEvents]);
  const streak = useMemo(() => calculateStreak(userEvents), [userEvents]);

  const topCategory = Object.entries(yearlyStats.byCategory).sort((a, b) => b[1] - a[1])[0];

  if (loading) {
    return (
      <div className="min-h-screen bg-background-main pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-primary mx-auto mb-4"></div>
            <p className="text-foreground-secondary">Loading your growth data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background-main pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center p-8">
            <div className="text-red-500 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-foreground-primary mb-2">Error Loading Growth Data</h3>
            <p className="text-foreground-secondary mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-accent-primary hover:bg-accent-primary-hover text-white px-4 py-2 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
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
            {topCategory && (
              <p className="text-xs text-foreground-tertiary mt-1">
                {`You've attended ${topCategory[1]} ${topCategory[0]} events this year`}
              </p>
            )}
          </div>
          <div className="bg-background-secondary rounded-xl p-6 border border-border-color">
            <h3 className="text-sm font-medium text-foreground-tertiary">Monthly Attendance Streak</h3>
            <p className="text-4xl font-bold text-foreground-primary mt-2">
              {streak} <span className="text-2xl">months</span>
            </p>
          </div>
        </div>

        {/* Category-based Skill Progression */}
        <div className="bg-background-secondary rounded-xl p-6 border border-border-color">
          <h2 className="text-lg font-semibold text-foreground-primary mb-4">
            Category-based Skill Progression
          </h2>
          {chartData.length > 0 ? (
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
                  <Bar dataKey="Mobile" stackId="a" fill="#0088fe" />
                  <Bar dataKey="DevOps" stackId="a" fill="#00c49f" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-foreground-secondary">No event data available yet.</p>
              <p className="text-sm text-foreground-tertiary mt-2">
                Start attending events to see your growth progression!
              </p>
            </div>
          )}
        </div>

        {/* Debug Info (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 bg-background-secondary rounded-xl p-6 border border-border-color">
            <h3 className="text-sm font-semibold text-foreground-primary mb-4">Debug Info</h3>
            <div className="space-y-2 text-sm text-foreground-secondary">
              <p>Total events loaded: {userEvents.length}</p>
              <p>Chart data points: {chartData.length}</p>
              <p>Categories found: {Object.keys(yearlyStats.byCategory).join(', ') || 'None'}</p>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}