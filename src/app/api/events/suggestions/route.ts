import { NextRequest } from 'next/server';
import { unauthorizedJson, successJson, errorJson } from '@/lib/api/apiResponse';
import { EventService } from '@/services/eventServices';
import type { SearchSuggestion } from '@/types';
import { requireOnboardedApi } from '@/utils/onboarding';
import { createClient } from '@/utils/supabase/server';

interface SuggestionsRequestBody {
  term?: string;
  limit?: number;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return unauthorizedJson();

    const onboardingGuard = await requireOnboardedApi(supabase, user.id);
    if (onboardingGuard) return onboardingGuard;

    const body = (await request.json().catch(() => ({}))) as SuggestionsRequestBody;
    const term = typeof body.term === 'string' ? body.term.trim() : '';
    const limit = Number.isFinite(body.limit) ? Math.min(20, Math.max(1, Number(body.limit))) : 8;

    if (term.length < 2) {
      return successJson({ suggestions: [] });
    }

    const eventSuggestions = await EventService.searchEvents(term, supabase, limit);

    const suggestions: SearchSuggestion[] = eventSuggestions.map((event) => ({
      id: `event-${event.id}`,
      title: event.title,
      type: 'event',
      subtitle: event.organizer || 'Organizer',
      icon: 'event',
      organizer: event.organizer,
      startTime: event.startTime,
      organizerLogoUrl: event.organizerLogoUrl ?? null
    }));

    // Add organizer suggestions based on event results
    const organizerLimit = Math.max(1, Math.floor(limit / 3));
    const organizerSuggestions: SearchSuggestion[] = [];
    const organizerSet = new Set<string>();

    for (const event of eventSuggestions) {
      const organizer = event.organizer?.trim();
      if (!organizer || organizerSet.has(organizer)) continue;
      organizerSet.add(organizer);
      organizerSuggestions.push({
        id: `organizer-${organizer}`,
        title: organizer,
        type: 'organizer',
        subtitle: 'Organizer',
        icon: 'people',
      });
      if (organizerSuggestions.length >= organizerLimit) break;
    }

    return successJson({
      suggestions: [...suggestions, ...organizerSuggestions].slice(0, limit)
    });
  } catch (error) {
    console.error('[API] Event suggestions error:', error);
    return errorJson('Failed to fetch suggestions', 500);
  }
}
