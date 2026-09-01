import { NextResponse } from 'next/server';

import { loadEngagementMap } from '@/app/api/mobile/engagement';
import { toMobileEventDetail } from '@/app/api/mobile/serializers';
import { EventAgendaSaveService } from '@/services/eventAgendaSaveService';
import { EventService } from '@/services/eventServices';
import type { SupabaseClientType } from '@/types';
import type { Event, Speaker } from '@/types/events';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';
import { createAdminClient } from '@/utils/supabase/server';

const EMPTY_NETWORKING_PULSE = {
  state: 'empty' as const,
  trendingTopic: null,
  mostSavedSession: null,
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }

  return String(error || 'Unknown error');
}

async function loadMobileEventDetailSource(
  id: string,
  supabase: NonNullable<
    Awaited<ReturnType<typeof getAuthenticatedRequestContext>>
  >['supabase']
) {
  try {
    return await EventService.getEventWithAgenda(id, supabase);
  } catch (idError) {
    if (getErrorMessage(idError).toLowerCase().includes('not found')) {
      // Universal Links use the canonical web slug while in-app navigation
      // uses the event id. A failed slug lookup must preserve the original
      // not-found response rather than converting it to a server error.
      try {
        const { data: slugMatch } = await supabase
          .from('events')
          .select('id')
          .eq('slug', id)
          .maybeSingle();

        if (slugMatch?.id) {
          return EventService.getEventWithAgenda(slugMatch.id, supabase);
        }
      } catch {
        // Preserve the original EventService error below.
      }

      throw idError;
    }

    console.warn(
      '[mobile/events] Agenda detail query failed; falling back to base event detail',
      { eventId: id, message: getErrorMessage(idError) }
    );

    return EventService.getEventById(id, supabase);
  }
}

type SpeakerLookupRow = {
  id: string;
  name: string | null;
  title: string | null;
  company: string | null;
  bio: string | null;
  photo_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  website_url: string | null;
};

function speakerNeedsResolvedId(speaker: Speaker) {
  const id = speaker.id?.trim();
  const name = speaker.name?.trim();
  return Boolean(name) && (!id || id === name);
}

function getSpeakerLinkedInUrl(speaker: Speaker) {
  return speaker.linkedinUrl?.trim() || speaker.socialLinks?.linkedin?.trim() || null;
}

async function hydrateSpeakerLineupIds(
  event: Event & { agenda?: Event['agenda'] },
  readClient: SupabaseClientType
): Promise<Event & { agenda?: Event['agenda'] }> {
  const speakerLineup = event.speakerLineup ?? [];
  const speakersToResolve = speakerLineup.filter(speakerNeedsResolvedId);

  if (speakersToResolve.length === 0) {
    return event;
  }

  const names = Array.from(
    new Set(speakersToResolve.map((speaker) => speaker.name.trim()).filter(Boolean))
  );
  const linkedinUrls = Array.from(
    new Set(
      speakersToResolve
        .map(getSpeakerLinkedInUrl)
        .filter((value): value is string => Boolean(value))
    )
  );

  const rows: SpeakerLookupRow[] = [];

  if (linkedinUrls.length > 0) {
    const { data, error } = await readClient
      .from('speakers')
      .select('id, name, title, company, bio, photo_url, linkedin_url, twitter_url, website_url')
      .in('linkedin_url', linkedinUrls);

    if (error) {
      throw error;
    }

    rows.push(...((data ?? []) as SpeakerLookupRow[]));
  }

  if (names.length > 0) {
    const { data, error } = await readClient
      .from('speakers')
      .select('id, name, title, company, bio, photo_url, linkedin_url, twitter_url, website_url')
      .in('name', names);

    if (error) {
      throw error;
    }

    rows.push(...((data ?? []) as SpeakerLookupRow[]));
  }

  const byLinkedIn = new Map<string, SpeakerLookupRow>();
  const byName = new Map<string, SpeakerLookupRow>();

  for (const row of rows) {
    if (row.linkedin_url?.trim()) {
      byLinkedIn.set(row.linkedin_url.trim(), row);
    }
    if (row.name?.trim()) {
      byName.set(row.name.trim().toLowerCase(), row);
    }
  }

  return {
    ...event,
    speakerLineup: speakerLineup.map((speaker) => {
      if (!speakerNeedsResolvedId(speaker)) {
        return speaker;
      }

      const linkedinUrl = getSpeakerLinkedInUrl(speaker);
      const match =
        (linkedinUrl ? byLinkedIn.get(linkedinUrl) : undefined) ??
        byName.get(speaker.name.trim().toLowerCase());

      if (!match) {
        return speaker;
      }

      return {
        ...speaker,
        id: match.id,
        title: speaker.title ?? match.title ?? undefined,
        company: speaker.company ?? match.company ?? undefined,
        bio: speaker.bio ?? match.bio ?? undefined,
        photoUrl: match.photo_url ?? speaker.photoUrl ?? undefined,
        linkedinUrl: speaker.linkedinUrl ?? match.linkedin_url ?? undefined,
        socialLinks: {
          ...speaker.socialLinks,
          linkedin: speaker.socialLinks?.linkedin ?? match.linkedin_url ?? undefined,
          twitter: speaker.socialLinks?.twitter ?? match.twitter_url ?? undefined,
          website: speaker.socialLinks?.website ?? match.website_url ?? undefined,
        },
      };
    }),
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await getAuthenticatedRequestContext(request as never);
    if (!authContext) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const loadedEvent = await loadMobileEventDetailSource(id, authContext.supabase);
    const adminClientPromise = createAdminClient();
    const event = await adminClientPromise
      .then((adminClient) => hydrateSpeakerLineupIds(loadedEvent, adminClient))
      .catch((error) => {
        console.warn('[mobile/events] Speaker lineup id hydration unavailable', {
          eventId: id,
          message: getErrorMessage(error),
        });
        return loadedEvent;
      });
    const networkingPulsePromise = adminClientPromise
      .then((adminClient) =>
        EventAgendaSaveService.buildNetworkingPulse(
          {
            eventId: id,
            agenda: event.agenda ?? [],
          },
          adminClient
        )
      )
      .catch((error) => {
        console.warn('[mobile/events] Networking pulse unavailable', {
          eventId: id,
          message: getErrorMessage(error),
        });
        return EMPTY_NETWORKING_PULSE;
      });
    const [engagementMap, savedAgendaItemIds, networkingPulse] = await Promise.all([
      loadEngagementMap(authContext.supabase, authContext.user.id, [id]).catch(
        (error) => {
          console.warn('[mobile/events] Engagement state unavailable', {
            eventId: id,
            message: getErrorMessage(error),
          });
          return new Map();
        }
      ),
      EventAgendaSaveService.getSavedAgendaItemIds(
        {
          eventId: id,
          userId: authContext.user.id,
        },
        authContext.supabase
      ).catch((error) => {
        console.warn('[mobile/events] Agenda save state unavailable', {
          eventId: id,
          message: getErrorMessage(error),
        });
        return new Set<string>();
      }),
      networkingPulsePromise,
    ]);

    return NextResponse.json({
      success: true,
      data: toMobileEventDetail(event, engagementMap.get(id), {
        savedAgendaItemIds,
        networkingPulse,
      }),
    });
  } catch (error) {
    const message = getErrorMessage(error) || 'Failed to load event detail';
    const status = message.toLowerCase().includes('not found') ? 404 : 500;

    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}
