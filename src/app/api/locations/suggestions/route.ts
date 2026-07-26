import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Configuration constants
const MAX_QUERY_RESULTS = 100; // Fetch more for grouping/counting
const MAX_SUGGESTIONS = 10; // Return top N most frequent locations
const MIN_QUERY_LENGTH = 2;

interface LocationSuggestion {
  city: string;
  state: string;
  country: string;
  count: number;
  displayText: string;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query || query.trim().length < MIN_QUERY_LENGTH) {
      return NextResponse.json(
        { error: `Query must be at least ${MIN_QUERY_LENGTH} characters` },
        { status: 400 }
      );
    }

    const term = query.trim();

    // Query distinct location combinations with event counts
    // Note: Using raw location field since normalized fields may not be in all schemas
    const { data, error } = await supabase
      .from('events')
      .select('location')
      .ilike('location', `%${term}%`)
      .not('location', 'is', null)
      .limit(MAX_QUERY_RESULTS);

    if (error) {
      console.error('[API] Location suggestions error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch location suggestions' },
        { status: 500 }
      );
    }

    // Group by location and count occurrences
    const locationMap = new Map<string, LocationSuggestion>();

    (data || []).forEach((row) => {
      const location = row.location || '';
      if (!location.trim()) return;

      // Parse location string (typically "City, State, Country" or variations)
      const parts = location.split(',').map(p => p.trim()).filter(Boolean);
      const city = parts[0] || '';
      const state = parts[1] || '';
      const country = parts[2] || parts[1] || ''; // Use parts[1] if only 2 parts

      // Create a unique key
      const key = location.toLowerCase();

      if (locationMap.has(key)) {
        const existing = locationMap.get(key)!;
        existing.count++;
      } else {
        locationMap.set(key, {
          city,
          state,
          country,
          count: 1,
          displayText: location
        });
      }
    });

    // Convert to array, sort by count (descending), and take top N
    const suggestions = Array.from(locationMap.values())
      .filter(loc => loc.displayText)
      .sort((a, b) => b.count - a.count)
      .slice(0, MAX_SUGGESTIONS)
      .map(loc => ({
        displayText: loc.displayText,
        city: loc.city,
        state: loc.state,
        country: loc.country,
        eventCount: loc.count
      }));

    return NextResponse.json({
      suggestions,
      query: term
    });

  } catch (error) {
    console.error('[API] Location suggestions unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
