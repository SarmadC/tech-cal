// src/app/calendar/page.tsx

import CalendarView from '@/components/CalendarView';
import { supabase } from '@/lib/supabaseClient';

export const revalidate = 0;

export default async function CalendarPage() {
  const [eventsRes, categoriesRes] = await Promise.all([
    supabase.from('events').select('*'),
    supabase.from('categories').select('*'),
  ]);

  const { data: events, error: eventsError } = eventsRes;
  const { data: categories, error: categoriesError } = categoriesRes;

  if (eventsError || categoriesError || !events || !categories) {
    console.error('Error fetching data:', eventsError || categoriesError);
    
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background-main">
        <div className="text-center max-w-md px-6">
          <div className="w-20 h-20 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground-primary mb-2">Unable to Load Calendar</h1>
          <p className="text-foreground-secondary mb-6">
            We couldn't fetch the calendar data. Please check your connection and try again.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-accent-primary hover:bg-accent-primary-hover text-white font-medium py-2.5 px-6 rounded-lg transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return <CalendarView initialEvents={events} categories={categories} />;
}