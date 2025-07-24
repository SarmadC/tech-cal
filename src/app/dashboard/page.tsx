// src/app/dashboard/page.tsx (Corrected)

'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth, useUserId } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import ProtectedRoute from '@/components/ProtectedRoute';
import GrowthDashboardPage from './growth/page';
import { Calendar, MapPin, ExternalLink, Trash2 } from 'lucide-react';

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

interface TrackedEventWithDetails {
    id: string;
    event_id: string;
    status: 'bookmarked' | 'attending' | 'attended' | 'cancelled';
    created_at: string;
    notes?: string;
    event: {
        id: string;
        title: string;
        start_time: string;
        end_time: string | null;
        organizer: string;
        location: string;
        event_type_id: string;
        source_url: string;
    } | null;
}

interface UserStats {
    eventsTracked: number;
    upcomingEvents: number;
    attendedEvents: number;
    categoriesFollowed: number;
    streakDays: number;
}

export default function DashboardPage() {
    const [activeTab, setActiveTab] = useState('overview');
    const [userStats, setUserStats] = useState<UserStats | null>(null);
    const [trackedEvents, setTrackedEvents] = useState<TrackedEventWithDetails[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { signOut, updateProfile } = useAuth();
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
                // Load user profile
                const { data: profile, error: profileError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', authUserId)
                    .single();

                if (profileError) throw profileError;
                setUserProfile(profile);

                // Load tracked events with full details
                const { data: userEvents, error: eventsError } = await supabase
                    .from('user_events')
                    .select(`
            id,
            event_id,
            status,
            created_at,
            notes,
            events (
              id,
              title,
              start_time,
              end_time,
              organizer,
              location,
              event_type_id,
              source_url
            )
          `)
                    .eq('user_id', authUserId)
                    .order('created_at', { ascending: false });

                if (eventsError) throw eventsError;

                // Transform the data properly
                const formattedEvents: TrackedEventWithDetails[] = (userEvents || []).map((ue: any) => ({
                    id: ue.id,
                    event_id: ue.event_id,
                    status: ue.status,
                    created_at: ue.created_at,
                    notes: ue.notes,
                    event: ue.events ? {
                        id: ue.events.id,
                        title: ue.events.title,
                        start_time: ue.events.start_time,
                        end_time: ue.events.end_time,
                        organizer: ue.events.organizer,
                        location: ue.events.location,
                        event_type_id: ue.events.event_type_id,
                        source_url: ue.events.source_url
                    } : null
                }));

                setTrackedEvents(formattedEvents);

                // Calculate stats
                const now = new Date();
                const upcomingEventsCount = formattedEvents.filter(te =>
                    te.event && new Date(te.event.start_time) >= now
                ).length;

                const attendedEventsCount = formattedEvents.filter(te =>
                    te.status === 'attended'
                ).length;

                const categoriesFollowed = new Set(
                    formattedEvents
                        .map(te => te.event?.event_type_id)
                        .filter(Boolean)
                ).size;

                setUserStats({
                    eventsTracked: formattedEvents.length,
                    upcomingEvents: upcomingEventsCount,
                    attendedEvents: attendedEventsCount,
                    categoriesFollowed,
                    streakDays: 12,
                });

            } catch (err: unknown) {
                const error = err as Error;
                console.error("Error loading dashboard data:", error);
                setError(`Failed to load dashboard. ${error.message}`);
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

    const handleUntrackEvent = async (eventId: string) => {
        try {
            const { error } = await supabase
                .from('user_events')
                .delete()
                .eq('user_id', authUserId)
                .eq('event_id', eventId);

            if (error) throw error;

            setTrackedEvents(prev => prev.filter(te => te.event_id !== eventId));

            if (userStats) {
                setUserStats({
                    ...userStats,
                    eventsTracked: userStats.eventsTracked - 1,
                    upcomingEvents: Math.max(0, userStats.upcomingEvents - 1)
                });
            }
        } catch (err) {
            console.error('Error untracking event:', err);
            setError('Failed to untrack event');
        }
    };

    // Categorize events for display
    const categorizedEvents = useMemo(() => {
        const now = new Date();
        return {
            upcoming: trackedEvents.filter(te =>
                te.event && new Date(te.event.start_time) >= now
            ).slice(0, 5),
            recent: trackedEvents.filter(te =>
                te.event && new Date(te.event.start_time) < now
            ).slice(0, 5)
        };
    }, [trackedEvents]);

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
                                Here&apos;s your personal hub for all things tech events.
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
                                <h3 className="text-sm font-medium text-foreground-tertiary">Events Attended</h3>
                                <p className="text-2xl font-bold text-foreground-primary">{userStats.attendedEvents}</p>
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
                                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab
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
                            {/* Upcoming Events */}
                            <div className="bg-background-secondary rounded-xl p-6 border border-border-color">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold text-foreground-primary">Upcoming Events</h2>
                                    <Link href="/calendar" className="text-accent-primary hover:underline text-sm">
                                        View All →
                                    </Link>
                                </div>
                                <div className="space-y-3">
                                    {categorizedEvents.upcoming.length > 0 ? (
                                        categorizedEvents.upcoming.map((trackedEvent) => (
                                            <div key={trackedEvent.id} className="flex items-center justify-between p-3 bg-background-main rounded-lg">
                                                <div className="flex items-center space-x-3 flex-1 min-w-0">
                                                    <div className="w-3 h-3 rounded-full bg-accent-primary" />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-medium text-foreground-primary truncate">
                                                            {trackedEvent.event?.title}
                                                        </p>
                                                        <div className="flex items-center space-x-4 text-xs text-foreground-tertiary">
                                                            <span className="flex items-center">
                                                                <Calendar className="w-3 h-3 mr-1" />
                                                                {trackedEvent.event?.start_time ? new Date(trackedEvent.event.start_time).toLocaleDateString() : 'TBD'}
                                                            </span>
                                                            <span className="flex items-center">
                                                                <MapPin className="w-3 h-3 mr-1" />
                                                                {trackedEvent.event?.organizer || 'Unknown'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <span className={`text-xs px-2 py-1 rounded-full capitalize ${trackedEvent.status === 'attending'
                                                            ? 'bg-green-100 text-green-800'
                                                            : 'bg-blue-100 text-blue-800'
                                                        }`}>
                                                        {trackedEvent.status}
                                                    </span>
                                                    {trackedEvent.event?.source_url && (
                                                        <a
                                                            href={trackedEvent.event.source_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-accent-primary hover:text-accent-primary-hover"
                                                        >
                                                            <ExternalLink className="w-4 h-4" />
                                                        </a>
                                                    )}
                                                    <button
                                                        onClick={() => handleUntrackEvent(trackedEvent.event_id)}
                                                        className="text-red-500 hover:text-red-700"
                                                        title="Untrack event"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8">
                                            <p className="text-foreground-tertiary">No upcoming events tracked.</p>
                                            <Link href="/calendar" className="text-accent-primary hover:underline text-sm font-medium">
                                                Browse events →
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Recent Events */}
                            <div className="bg-background-secondary rounded-xl p-6 border border-border-color">
                                <h2 className="text-lg font-semibold text-foreground-primary mb-4">Recently Tracked</h2>
                                <div className="space-y-3">
                                    {categorizedEvents.recent.length > 0 ? (
                                        categorizedEvents.recent.map((trackedEvent) => (
                                            <div key={trackedEvent.id} className="flex items-center justify-between p-3 bg-background-main rounded-lg">
                                                <div className="flex items-center space-x-3 flex-1 min-w-0">
                                                    <div className="w-3 h-3 rounded-full bg-gray-400" />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-medium text-foreground-primary truncate">
                                                            {trackedEvent.event?.title}
                                                        </p>
                                                        <div className="flex items-center space-x-4 text-xs text-foreground-tertiary">
                                                            <span>
                                                                Tracked {new Date(trackedEvent.created_at).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <span className={`text-xs px-2 py-1 rounded-full capitalize ${trackedEvent.status === 'attended'
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    {trackedEvent.status}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8">
                                            <p className="text-foreground-tertiary">No events tracked yet.</p>
                                            <Link href="/calendar" className="text-accent-primary hover:underline text-sm font-medium">
                                                Browse events →
                                            </Link>
                                        </div>
                                    )}
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