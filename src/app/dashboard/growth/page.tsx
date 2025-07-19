// src/app/dashboard/growth/page.tsx (Build Fixed)

'use client';

import { useState, useEffect } from 'react'; // Removed unused 'useMemo'
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

interface FetchedGrowthEvent {
  created_at: string;
  events: {
    event_type: {
      name: string;
    }[] | null;
  }[] | null;
}

// --- Helper Functions ---
const fetchUserEventsForGrowth = async (userId: string): Promise<UserEvent[]> => {
  const { data, error } = await supabase
    .from('user_events')
    .select('created_at, events(event_type(name))')
    .eq('user_id', userId)
    .eq('status', 'attended');

  if (error) {
    console.error('Error fetching growth events:', error);
    return [];
  }

  return (data as FetchedGrowthEvent[])
    .map((userEvent) => ({
      attendedAt: userEvent.created_at,
      category: userEvent.events?.[0]?.event_type?.[0]?.name || 'Unknown',
    }))
    .filter(event => event.category !== 'Unknown');
};

const prepareChartData = (events: UserEvent[]): ChartData[] => {
    const monthlyData: Record<string, Record<string, number>> = {};
  
    events.forEach(event => {
      const month = new Date(event.attendedAt).toLocaleString('default', { month: 'short', year: 'numeric' });
      if (!monthlyData[month]) {
        monthlyData[month] = {};
      }
      monthlyData[month][event.category] = (monthlyData[month][event.category] || 0) + 1;
    });
  
    return Object.keys(monthlyData).map(month => ({
      month,
      ...monthlyData[month],
    })).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
};

// --- Main Component ---
function GrowthDashboardPage() {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [yearlyStats, setYearlyStats] = useState<{ total: number; topCategory: string | null }>({ total: 0, topCategory: null });
  const [loading, setLoading] = useState(true);
  const userId = useUserId();

  useEffect(() => {
    const loadData = async () => {      
      if (!userId) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const events = await fetchUserEventsForGrowth(userId);
        
        const eventsThisYear = events.filter(e => new Date(e.attendedAt).getFullYear() === new Date().getFullYear());
        const categoryCounts = eventsThisYear.reduce((acc, event) => {
            acc[event.category] = (acc[event.category] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const topCategory = Object.keys(categoryCounts).length > 0
            ? Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0][0]
            : null;

        setYearlyStats({ total: eventsThisYear.length, topCategory });
        setChartData(prepareChartData(events));

      } catch (err) {
        console.error('Error loading growth data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [userId]);

  const categoryColors = {
      'AI & ML': '#8884d8',
      'Web Dev': '#82ca9d',
      'Cloud': '#ffc658',
      'Security': '#ff8042',
      'Mobile': '#0088fe',
      'DevOps': '#00c49f',
      'AR/VR': '#ff7300',
      'Programming': '#22a5f1',
  };

  if (loading) {
    return (
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-primary mx-auto mb-4"></div>
          <p className="text-foreground-secondary">Calculating your growth...</p>
        </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background-main pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground-primary mb-2">Your Personal Growth</h1>
            {/* ✅ FIX: Replaced ' with &apos; */}
            <p className="text-foreground-secondary">Track your learning journey through the tech events you&apos;ve attended.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-background-secondary rounded-xl p-6 border border-border-color">
              <h3 className="text-sm font-medium text-foreground-tertiary">Total Events Attended (This Year)</h3>
              <p className="text-4xl font-bold text-foreground-primary mt-2">{yearlyStats.total}</p>
            </div>
            <div className="bg-background-secondary rounded-xl p-6 border border-border-color">
              <h3 className="text-sm font-medium text-foreground-tertiary">Your Top Category (This Year)</h3>
              <p className="text-4xl font-bold text-accent-primary mt-2">{yearlyStats.topCategory || 'N/A'}</p>
            </div>
          </div>

          <div className="bg-background-secondary rounded-xl p-6 border border-border-color">
            <h2 className="text-lg font-semibold text-foreground-primary mb-4">Monthly Attendance by Category</h2>
            {chartData.length > 0 ? (
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    {Object.entries(categoryColors).map(([category, color]) => (
                        <Bar key={category} dataKey={category} stackId="a" fill={color} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-foreground-secondary">No event attendance data available yet.</p>
                <p className="text-sm text-foreground-tertiary mt-2">
                  {/* ✅ FIX: Replaced ' with &apos; */}
                  Start tracking events you&apos;ve attended to see your growth chart!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default GrowthDashboardPage;