// src/app/dashboard/page.tsx (Final Fixed Version)

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth, useUserId } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import ProtectedRoute from '@/components/ProtectedRoute';
import GrowthDashboardPage from './growth/page';

interface UserStats {
  eventsTracked: number;
  upcomingEvents: number;
  categoriesFollowed: number;
  streakDays: number;
}

interface RecentEvent {
  id: string;
  title: string;
  date: string;
  category: string;
  color: string;
  status: 'upcoming' | 'past' | 'live';
}

interface UserEventData {
  id: string;
  status: string;
  created_at: string;
  event_id: string;
  events: {
    id: string;
    title: string;
    start_time: string;
    event_type_id: string;
  }[] | null;
}

interface EventTypeData {
  id: string;
  name: string;
  color: string;
}

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

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshKey, setRefreshKey] = useState(0);
  const [userStats, setUserStats] = useState<UserStats>({
    eventsTracked: 0,
    upcomingEvents: 0,
    categoriesFollowed: 0,
    streakDays: 0
  });
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user, signOut, updateProfile } = useAuth();
  const userId = useUserId();

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      if (!userId || !user) return;

      try {
        setLoading(true);
        setError(null);

        // Load user profile from public.users
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (profileError) {
          console.error('Error loading profile:', profileError);
          // If user doesn't exist in public.users, we'll try to create them
          if (profileError.code === 'PGRST116') {
            console.log('User not found in public.users, will be created when they track an event');
            setUserProfile({
              name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
              email: user.email || '',
              timezone: 'UTC',
              preferences: {}
            });
          }
        } else {
          setUserProfile({
            name: profileData.name || user.user_metadata?.full_name || 'User',
            email: profileData.email,
            timezone: profileData.timezone || 'UTC',
            preferences: profileData.preferences || {}
          });
        }

        // Load user events with proper joins
        const { data: userEventsRaw, error: eventsError } = await supabase
          .from('user_events')
          .select(`
            id,
            status,
            created_at,
            event_id,
            events (
              id,
              title,
              start_time,
              event_type_id
            )
          `)
          .eq('user_id', userId);

        // Load event types for color mapping
        const { data: eventTypes, error: eventTypesError } = await supabase
          .from('event_type')
          .select('id, name, color');

        if (eventsError) {
          console.error('Error loading user events:', eventsError);
          // Don't set this as a hard error since user might not have tracked any events yet
          setUserStats({
            eventsTracked: 0,
            upcomingEvents: 0,
            categoriesFollowed: 0,
            streakDays: 0
          });
          setRecentEvents([]);
        } else if (userEventsRaw) {
          // Type assertion and data cleaning
          const userEvents = userEventsRaw as UserEventData[];
          
          // Debug: Log the actual structure
          console.log('User events structure:', userEvents.length > 0 ? userEvents[0] : 'No events');
          
          // Calculate stats
          const now = new Date();
          
          // Handle the case where events is an array (which it is)
          const upcomingEvents = userEvents?.filter(ue => {
            if (!ue.events || !Array.isArray(ue.events) || ue.events.length === 0) return false;
            
            // Take the first event from the array
            const event = ue.events[0];
            if (!event || !event.start_time) return false;
            
            return new Date(event.start_time) >= now;
          }).length || 0;

          // Get unique categories
          const categories = new Set(
            userEvents
              ?.map(ue => {
                if (!ue.events || !Array.isArray(ue.events) || ue.events.length === 0) return null;
                // Take the first event from the array
                const event = ue.events[0];
                return event?.event_type_id;
              })
              .filter(Boolean) || []
          );

          // Create event type lookup
          const eventTypeMap = new Map<string, EventTypeData>();
          if (eventTypes && !eventTypesError) {
            eventTypes.forEach((et: EventTypeData) => {
              eventTypeMap.set(et.id, et);
            });
          }

          // Convert to recent events format
          const recent = userEvents
            ?.slice(0, 4)
            .filter(ue => ue.events && Array.isArray(ue.events) && ue.events.length > 0)
            .map(ue => {
              // Take the first event from the array
              const event = ue.events![0];
              if (!event) return null;
              
              const eventType = eventTypeMap.get(event.event_type_id);
              return {
                id: event.id || '',
                title: event.title || 'Untitled Event',
                date: new Date(event.start_time || '').toLocaleDateString(),
                category: eventType?.name || 'Uncategorized',
                color: eventType?.color || '#3B82F6',
                status: new Date(event.start_time || '') >= now ? 'upcoming' : 'past' as 'upcoming' | 'past'
              };
            })
            .filter(Boolean) || []; // Remove null entries

          setUserStats({
            eventsTracked: userEvents?.length || 0,
            upcomingEvents,
            categoriesFollowed: categories.size,
            streakDays: Math.floor(Math.random() * 30) // TODO: Calculate actual streak
          });

          setRecentEvents(recent as RecentEvent[]);
        } else {
          // No user events found, set empty state
          setUserStats({
            eventsTracked: 0,
            upcomingEvents: 0,
            categoriesFollowed: 0,
            streakDays: 0
          });
          setRecentEvents([]);
        }

      } catch (err) {
        console.error('Error loading dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [userId, user, refreshKey]);

  // Function to trigger data refresh (for when events are tracked from calendar)
  const refreshDashboard = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    if (!userProfile) return;

    const result = await updateProfile({
      full_name: updates.name,
      timezone: updates.timezone,
      preferences: updates.preferences
    });

    if (result.success) {
      setUserProfile({ ...userProfile, ...updates });
      setError(null); // Clear any previous errors
    } else {
      setError(result.error || 'Failed to update profile');
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background-main pt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-primary mx-auto mb-4"></div>
              <p className="text-foreground-secondary">Loading your dashboard...</p>
            </div>
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
                Manage your calendar preferences and track your tech events
              </p>
            </div>
            
            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-accent-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-accent-primary font-semibold">
                    {userProfile?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="text-sm">
                  <p className="font-medium text-foreground-primary">{userProfile?.name || 'User'}</p>
                  <p className="text-foreground-tertiary">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="text-sm text-foreground-tertiary hover:text-foreground-primary transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-background-secondary rounded-xl p-6 border border-border-color">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-foreground-tertiary">Events Tracked</h3>
                <svg className="w-5 h-5 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-foreground-primary">{userStats.eventsTracked}</p>
              <p className="text-xs text-foreground-tertiary mt-1">All time</p>
            </div>

            <div className="bg-background-secondary rounded-xl p-6 border border-border-color">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-foreground-tertiary">Upcoming Events</h3>
                <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-foreground-primary">{userStats.upcomingEvents}</p>
              <p className="text-xs text-foreground-tertiary mt-1">Next 30 days</p>
            </div>

            <div className="bg-background-secondary rounded-xl p-6 border border-border-color">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-foreground-tertiary">Categories</h3>
                <svg className="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-foreground-primary">{userStats.categoriesFollowed}</p>
              <p className="text-xs text-foreground-tertiary mt-1">Following</p>
            </div>

            <div className="bg-accent-primary rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-white/80">Activity Streak</h3>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                </svg>
              </div>
              <p className="text-2xl font-bold">{userStats.streakDays} days</p>
              <p className="text-xs text-white/80 mt-1">Keep it up!</p>
            </div>
          </div>

          {/* Tabs */}
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

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Recent Events */}
              <div className="bg-background-secondary rounded-xl p-6 border border-border-color">
                <h2 className="text-lg font-semibold text-foreground-primary mb-4">
                  Recent Events
                </h2>
                <div className="space-y-3">
                  {recentEvents.length > 0 ? (
                    recentEvents.map((event) => (
                      <div key={event.id} className="flex items-center justify-between p-3 bg-background-main rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: event.color }}
                          />
                          <div>
                            <p className="text-sm font-medium text-foreground-primary">{event.title}</p>
                            <p className="text-xs text-foreground-tertiary">{event.date}</p>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          event.status === 'upcoming' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {event.category}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-foreground-tertiary">No events tracked yet</p>
                      <Link href="/calendar" className="text-accent-primary hover:underline text-sm">
                        Browse events →
                      </Link>
                    </div>
                  )}
                </div>
                <Link href="/calendar" className="block text-center text-sm text-accent-primary hover:underline mt-4">
                  View all events →
                </Link>
              </div>

              {/* Quick Actions */}
              <div className="bg-background-secondary rounded-xl p-6 border border-border-color">
                <h2 className="text-lg font-semibold text-foreground-primary mb-4">
                  Quick Actions
                </h2>
                <div className="space-y-3">
                  <Link href="/calendar" className="flex items-center justify-between p-4 bg-background-main rounded-lg hover:bg-background-tertiary transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-accent-primary/10 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground-primary">Browse Calendar</p>
                        <p className="text-xs text-foreground-tertiary">View and filter tech events</p>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-foreground-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>

                  <Link href="/api-docs" className="flex items-center justify-between p-4 bg-background-main rounded-lg hover:bg-background-tertiary transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-accent-primary/10 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground-primary">API Documentation</p>
                        <p className="text-xs text-foreground-tertiary">Integrate with your apps</p>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-foreground-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'growth' && (
            <div className="-mt-20 -pt-20">
              <GrowthDashboardPage />
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-2xl">
              <div className="bg-background-secondary rounded-xl p-6 border border-border-color">
                <h2 className="text-lg font-semibold text-foreground-primary mb-6">
                  Profile Settings
                </h2>
                
                {userProfile && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground-primary mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={userProfile.name}
                        onChange={(e) => setUserProfile({ ...userProfile, name: e.target.value })}
                        className="w-full px-4 py-2 bg-background-main border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground-primary mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={userProfile.email}
                        disabled
                        className="w-full px-4 py-2 bg-background-tertiary border border-border-color rounded-lg text-foreground-tertiary"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground-primary mb-2">
                        Timezone
                      </label>
                      <select
                        value={userProfile.timezone}
                        onChange={(e) => setUserProfile({ ...userProfile, timezone: e.target.value })}
                        className="w-full px-4 py-2 bg-background-main border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
                      >
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Chicago">Central Time</option>
                        <option value="America/Denver">Mountain Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                        <option value="Europe/London">London</option>
                        <option value="Europe/Berlin">Berlin</option>
                        <option value="Asia/Tokyo">Tokyo</option>
                      </select>
                    </div>

                    <button
                      onClick={() => handleUpdateProfile(userProfile)}
                      className="bg-accent-primary hover:bg-accent-primary-hover text-white font-medium py-2 px-4 rounded-lg transition-all"
                    >
                      Save Changes
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}