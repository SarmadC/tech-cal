// src/app/dashboard/page.tsx (Final Version with Type Fixes)

'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth, useUserId } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import ProtectedRoute from '@/components/ProtectedRoute';
import GrowthDashboardPage from './growth/page';

// --- Type Definitions ---
interface UserProfile {
  name: string;
  email: string;
  timezone: string;
  preferences: {
    theme?: string;
    notifications?: boolean;
    categories?: string[];
  };
}

interface RecentEvent {
  id: string;
  title: string;
  date: string;
  category: string;
  color: string;
  status: 'upcoming' | 'past'; // This type is now strict
}

interface UserStats {
  eventsTracked: number;
  upcomingEvents: number;
  categoriesFollowed: number;
  streakDays: number;
}

// ✅ FIX: The 'events' property is now correctly typed as an array
interface FetchedUserEvent {
  event_id: string;
  events: {
    id: string;
    title: string;
    start_time: string;
    event_type_id: string;
  }[] | null; // It's an array of events or null
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user, signOut, updateProfile } = useAuth();
  const authUserId = useUserId();

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!authUserId) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);

      try {
        const [profileResult, typesResult, eventsResult] = await Promise.all([
          supabase.from('users').select('*').eq('id', authUserId).single(),
          supabase.from('event_type').select('id, name, color'),
          supabase.from('user_events').select('event_id, events(id, title, start_time, event_type_id)').eq('user_id', authUserId)
        ]);

        if (profileResult.error) throw profileResult.error;
        setUserProfile(profileResult.data);

        if (typesResult.error) throw typesResult.error;
        const eventTypeMap = new Map(typesResult.data.map(et => [et.id, et]));

        if (eventsResult.error) throw eventsResult.error;
        const trackedEvents: FetchedUserEvent[] = eventsResult.data || [];
        
        // ✅ FIX: We now correctly handle the events array, taking the first event
        const validEvents = trackedEvents.map(ue => ue.events?.[0]).filter(Boolean);

        const now = new Date();
        const upcomingEventsCount = validEvents.filter(e => new Date(e!.start_time) >= now).length;
        const followedCategories = new Set(validEvents.map(e => e!.event_type_id));
        
        setUserStats({
          eventsTracked: validEvents.length,
          upcomingEvents: upcomingEventsCount,
          categoriesFollowed: followedCategories.size,
          streakDays: 12,
        });

        // ✅ FIX: Explicitly cast the status to the correct type
        const formattedRecentEvents = validEvents.slice(0, 5).map(event => {
            const eventType = eventTypeMap.get(event!.event_type_id);
            const isUpcoming = new Date(event!.start_time) >= now;
            return {
              id: event!.id,
              title: event!.title,
              date: new Date(event!.start_time).toLocaleDateString(),
              category: eventType?.name || 'Uncategorized',
              color: eventType?.color || '#3B82F6',
              status: (isUpcoming ? 'upcoming' : 'past') as 'upcoming' | 'past',
            };
        });
        setRecentEvents(formattedRecentEvents);

      } catch (err: any) {
        console.error("Error loading dashboard data:", err);
        setError(`Failed to load dashboard. ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [authUserId]);
  
  const handleUpdateProfile = useMemo(() => async (updates: Partial<UserProfile>) => {
    if (!userProfile) return;
    const result = await updateProfile({
        full_name: updates.name,
        timezone: updates.timezone,
        preferences: updates.preferences,
    });
    if (result.success) {
        setUserProfile({ ...userProfile, ...updates });
        setError(null);
    } else {
        setError(result.error || 'Failed to update profile');
    }
  }, [userProfile, updateProfile]);

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background-main pt-20 flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-primary mx-auto mb-4"></div>
                <p className="text-foreground-secondary">Loading your dashboard...</p>
            </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background-main pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground-primary mb-2">
                Welcome back, {userProfile?.name?.split(' ')[0] || 'User'}
              </h1>
              <p className="text-foreground-secondary">
                Here's your personal hub for all things tech events.
              </p>
            </div>
            <button
                onClick={signOut}
                className="text-sm text-foreground-tertiary hover:text-foreground-primary transition-colors"
              >
                Sign Out
              </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          
          {/* Stats Grid */}
          {userStats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-background-secondary rounded-xl p-6 border border-border-color">
                <h3 className="text-sm font-medium text-foreground-tertiary">Events Tracked</h3>
                <p className="text-2xl font-bold text-foreground-primary">{userStats.eventsTracked}</p>
              </div>
              <div className="bg-background-secondary rounded-xl p-6 border border-border-color">
                <h3 className="text-sm font-medium text-foreground-tertiary">Upcoming Events</h3>
                <p className="text-2xl font-bold text-foreground-primary">{userStats.upcomingEvents}</p>
              </div>
              <div className="bg-background-secondary rounded-xl p-6 border border-border-color">
                <h3 className="text-sm font-medium text-foreground-tertiary">Categories Followed</h3>
                <p className="text-2xl font-bold text-foreground-primary">{userStats.categoriesFollowed}</p>
              </div>
              <div className="bg-accent-primary rounded-xl p-6 text-white">
                <h3 className="text-sm font-medium text-white/80">Activity Streak</h3>
                <p className="text-2xl font-bold">{userStats.streakDays} days</p>
              </div>
            </div>
          )}
          
          {/* Tabs and Content */}
          <div className="border-b border-border-color mb-6">
            <nav className="flex space-x-8">
              {['overview', 'growth', 'settings'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab
                      ? 'border-accent-primary text-accent-primary'
                      : 'border-transparent text-foreground-tertiary hover:text-foreground-primary'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>

          {activeTab === 'overview' && (
             <div className="grid lg:grid-cols-2 gap-8">
              <div className="bg-background-secondary rounded-xl p-6 border border-border-color">
                <h2 className="text-lg font-semibold text-foreground-primary mb-4">Recently Tracked</h2>
                <div className="space-y-3">
                  {recentEvents.length > 0 ? (
                    recentEvents.map((event) => (
                      <div key={event.id} className="flex items-center justify-between p-3 bg-background-main rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: event.color }} />
                          <div>
                            <p className="text-sm font-medium text-foreground-primary">{event.title}</p>
                            <p className="text-xs text-foreground-tertiary">{event.date}</p>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                          event.status === 'upcoming' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>{event.status}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-foreground-tertiary">You haven't tracked any events yet.</p>
                      <Link href="/calendar" className="text-accent-primary hover:underline text-sm font-medium">
                        Browse events →
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-background-secondary rounded-xl p-6 border border-border-color">
                <h2 className="text-lg font-semibold text-foreground-primary mb-4">Quick Actions</h2>
                <div className="space-y-3">
                  <Link href="/calendar" className="flex items-center justify-between p-4 bg-background-main rounded-lg hover:bg-background-tertiary transition-colors">
                      <p className="font-medium text-foreground-primary">Browse Full Calendar</p>
                  </Link>
                  <Link href="/api-docs" className="flex items-center justify-between p-4 bg-background-main rounded-lg hover:bg-background-tertiary transition-colors">
                      <p className="font-medium text-foreground-primary">View API Docs</p>
                  </Link>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'growth' && (
            <GrowthDashboardPage />
          )}

          {activeTab === 'settings' && userProfile && (
            <div className="max-w-2xl bg-background-secondary rounded-xl p-6 border border-border-color">
                <h2 className="text-lg font-semibold text-foreground-primary mb-6">Profile Settings</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground-primary mb-2">Full Name</label>
                        <input
                            type="text"
                            value={userProfile.name}
                            onChange={(e) => setUserProfile({ ...userProfile, name: e.target.value })}
                            className="w-full px-4 py-2 bg-background-main border border-border-color rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground-primary mb-2">Email</label>
                        <input type="email" value={userProfile.email} disabled className="w-full px-4 py-2 bg-background-tertiary border-border-color rounded-lg text-foreground-tertiary" />
                    </div>
                    <button onClick={() => handleUpdateProfile(userProfile)} className="bg-accent-primary hover:bg-accent-primary-hover text-white font-medium py-2 px-4 rounded-lg">
                        Save Changes
                    </button>
                </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}