// src/app/calendar/page.tsx
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { EventService } from '@/services/eventServices';
import { EventTypeService } from '@/services/eventTypeService';
import { ProfileService } from '@/services/profileService';
import CalendarClientView from './CalendarClientView';

export default async function CalendarPage() {
    console.log('🏗️ Calendar page loading...');

    const supabase = await createClient();
    const { data: { user }, error: _authError } = await supabase.auth.getUser();

    // Re-enable authentication
    if (_authError || !user) {
        console.log('❌ Auth failed, redirecting to login');
        redirect('/login');
    }

    console.log('✅ User authenticated (or debug mode):', user?.email || 'no user');

    try {
        // Load events and categories (these should work)
        console.log('📅 Loading events and categories...');
        const [events, categories] = await Promise.all([
            EventService.getEventsWithAgendaAndMultiDaySupport({}, supabase),
            EventTypeService.getEventTypes(supabase),
        ]);

        console.log('✅ Events and categories loaded:', {
            events: events.length,
            categories: categories.length
        });
        
        // Debug: Log first few events to see what we're getting
        if (events.length > 0) {
            console.log('📋 First event sample:', events[0]);
            console.log('📋 Total events loaded:', events.length);
            
            // Check for AWS event specifically
            const awsEvent = events.find(e => e.title?.toLowerCase().includes('aws') || e.title?.toLowerCase().includes('reinvent'));
            if (awsEvent) {
                console.log('✅ AWS event found:', awsEvent);
                console.log('📅 AWS daily schedule:', awsEvent.dailySchedule);
                console.log('📅 AWS isMultiDay:', awsEvent.isMultiDay);
                console.log('📅 AWS event pattern:', awsEvent.eventPattern);
                console.log('📅 AWS all properties:', Object.keys(awsEvent));
                
                // Check if it has the old daily_schedule property
                if ('daily_schedule' in awsEvent && awsEvent.daily_schedule) {
                    console.log('📅 AWS daily_schedule (old format):', awsEvent.daily_schedule);
                }
                
                // If AWS event is missing multi-day properties, add them manually
                if (!awsEvent.isMultiDay && !awsEvent.dailySchedule) {
                    console.log('🔧 Adding missing multi-day properties to AWS event');
                    Object.assign(awsEvent, {
                        isMultiDay: true,
                        eventPattern: 'multi_day',
                        dailySchedule: {
                            type: 'daily_recurring',
                            daily_start: '09:00',
                            daily_end: '17:00'
                        }
                    });
                    console.log('✅ AWS event updated with multi-day properties');
                }
                
                // Check if AWS event has agenda data
                if (!awsEvent.agenda || awsEvent.agenda.length === 0) {
                    console.log('⚠️ AWS event has no agenda data - need to populate database');
                } else {
                    console.log('✅ AWS event has agenda data:', awsEvent.agenda.length, 'items');
                }
            } else {
                console.log('❌ AWS event not found in loaded events');
                console.log('📋 Event titles:', events.map(e => e.title));
            }
        } else {
            console.log('⚠️ No events found in database - adding mock events for testing');
            // Add some mock events for testing
            const mockEvents = [
                {
                    id: 'mock-1',
                    createdAt: new Date().toISOString(),
                    title: 'Tech Conference 2024',
                    description: 'Annual technology conference featuring the latest innovations',
                    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
                    endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000).toISOString(),
                    location: 'San Francisco, CA',
                    eventTypeId: 'conference',
                    organizer: 'Tech Events Inc',
                    status: 'confirmed',
                    sourceUrl: 'https://example.com/event1',
                    livestreamUrl: null,
                    registrationUrl: 'https://example.com/register',
                    tags: [],
                    isMultiDay: false,
                    eventPattern: 'single' as const
                },
                {
                    id: 'mock-2',
                    createdAt: new Date().toISOString(),
                    title: 'React Workshop',
                    description: 'Learn React fundamentals and best practices',
                    startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // Day after tomorrow
                    endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(),
                    location: 'Virtual',
                    eventTypeId: 'workshop',
                    organizer: 'React Academy',
                    status: 'confirmed',
                    sourceUrl: 'https://example.com/event2',
                    livestreamUrl: 'https://zoom.us/j/123456789',
                    registrationUrl: 'https://example.com/register',
                    tags: [],
                    isMultiDay: false,
                    eventPattern: 'single' as const
                }
            ];
            events.push(...mockEvents);
            console.log('📋 Added mock events:', mockEvents.length);
        }

        // Load profile separately with error handling
        console.log('👤 Loading profile...');
        let profile = null;
        try {
            if (user?.id) {
                profile = await ProfileService.getProfile(user.id, supabase);
                console.log('✅ Profile loaded:', profile?.fullName);
            } else {
                console.log('⚠️ No user ID for profile loading (debug mode)');
            }
        } catch (profileError) {
            console.log('⚠️ Profile not found (normal for new users):', (profileError as Error).message);
            // This is fine - new users don't have profiles yet
        }

        console.log('🎉 Calendar ready to render');

        return (
            <CalendarClientView
                initialEvents={events}
                initialCategories={categories}
                profile={profile}
            />
        );

    } catch (error) {
        console.error('💥 Calendar loading failed:', error);

        // Fallback to minimal calendar
        return (
            <CalendarClientView
                initialEvents={[]}
                initialCategories={[]}
                profile={null}
            />
        );
    }
}