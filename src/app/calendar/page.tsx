// src/app/calendar/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { EventService } from '@/services/eventServices';
import { EventTypeService } from '@/services/eventTypeService';
import { ProfileService } from '@/services/profileService';
import CalendarClientView from './CalendarClientView';
import Loading from '@/components/Loading';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import type { AppEvent, AppEventType, AppProfile } from '@/types';

export default function KureCalendarPage() {
    const { user, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<{
        events: AppEvent[];
        categories: AppEventType[];
        profile: AppProfile | null;
    }>({
        events: [],
        categories: [],
        profile: null
    });
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            if (!user) return;

            try {
                setLoading(true);
                setError(null);

                const [eventsResponse, categoriesResponse, profileResponse] = await Promise.all([
                    EventService.getEvents(),
                    EventTypeService.getEventTypesWithCounts(),
                    ProfileService.getProfile(user.id),
                ]);

                if (!eventsResponse.success) {
                    throw new Error(eventsResponse.error || 'Failed to load events');
                }

                if (!categoriesResponse.success) {
                    throw new Error(categoriesResponse.error || 'Failed to load categories');
                }

                setData({
                    events: eventsResponse.data || [],
                    categories: categoriesResponse.data || [],
                    profile: profileResponse.success ? profileResponse.data || null : null
                });
            } catch (err) {
                console.error('Failed to load calendar data:', err);
                setError(err instanceof Error ? err.message : 'Failed to load calendar data');
            } finally {
                setLoading(false);
            }
        };

        if (!authLoading && user) {
            loadData();
        } else if (!authLoading && !user) {
            setLoading(false);
        }
    }, [user, authLoading]);

    if (authLoading || loading) {
        return <Loading />;
    }

    if (error) {
        return (
            <ProtectedRoute>
                <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
                    <div className="text-center">
                        <h2 className="text-xl font-semibold text-red-800 mb-2">Error Loading Calendar</h2>
                        <p className="text-red-600 mb-4">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </ProtectedRoute>
        );
    }

    return (
        <ProtectedRoute>
            <CalendarClientView
                initialEvents={data.events}
                initialCategories={data.categories}
                profile={data.profile}
            />
        </ProtectedRoute>
    );
}