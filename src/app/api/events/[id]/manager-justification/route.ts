import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';
import { createHash } from 'crypto';
import { createClient } from '@/utils/supabase/server';
import { requireOnboardedApi } from '@/utils/onboarding';
import { eventDetailedTransformer } from '@/utils/transformers';
import { CareerProfileService } from '@/services/careerProfileService';
import { rankEventsWithRecommendationPipeline as rankEventsWithCanonicalPipeline } from '@/services/recommendations/recommendationPipeline';
import { calculateBaseScore, getAlignmentCategory } from '@/lib/recommendation/baseScorer';
import type { CareerProfile } from '@/types/career';
import type { Event, EventWithCareerImpact } from '@/types';
import type {
  ManagerJustificationData,
  ManagerJustificationResponse,
} from '@/types/managerJustification';

const EVENT_SELECT_COLUMNS = [
  'id',
  'created_at',
  'updated_at',
  'title',
  'description',
  'start_time',
  'end_time',
  'timezone',
  'location',
  'status',
  'source_url',
  'livestream_url',
  'registration_url',
  'event_type_id',
  'event_image_url',
  'price_range',
  'price_min',
  'capacity',
  'attendee_count',
  'difficulty_level',
  'target_audience',
  'prerequisites',
  'agenda_url',
  'speaker_lineup',
  'organizer_id',
  'organizer_name',
  'organizer_logo_url',
  'event_type_name',
  'event_type_color',
  'tags',
].join(',');

const JUSTIFICATION_CACHE_PREFIX = 'manager-justification:v1';
const JUSTIFICATION_CACHE_TTL_SECONDS = 60 * 20; // 20 minutes
const CACHE_IO_TIMEOUT_MS = 200;
const RATE_LIMIT_TIMEOUT_MS = 200;
const DATA_FETCH_TIMEOUT_MS = 5000;
const SCORING_TIMEOUT_MS = Number.isFinite(
  Number.parseInt(process.env.MANAGER_JUSTIFICATION_SCORING_TIMEOUT_MS ?? '', 10)
)
  ? Math.max(2000, Number.parseInt(process.env.MANAGER_JUSTIFICATION_SCORING_TIMEOUT_MS ?? '', 10))
  : 5000;

const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  analytics: true,
  prefix: 'manager-justification',
});

const NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store' } as const;

function jsonNoStore(
  body: ManagerJustificationResponse,
  init?: ResponseInit
): NextResponse<ManagerJustificationResponse> {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...NO_STORE_HEADERS,
      ...(init?.headers || {}),
    },
  });
}

function withNoStore(
  response: NextResponse<ManagerJustificationResponse>
): NextResponse<ManagerJustificationResponse> {
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallbackValue: T): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => resolve(fallbackValue), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function buildProfileFingerprint(profile: {
  currentRole?: string | null;
  seniority?: string | null;
  industry?: string | null;
  primarySkills?: string[] | null;
  skillsToLearn?: string[] | null;
  careerGoals?: unknown[] | null;
}): string {
  const payload = JSON.stringify({
    currentRole: profile.currentRole || '',
    seniority: profile.seniority || '',
    industry: profile.industry || '',
    primarySkills: profile.primarySkills || [],
    skillsToLearn: profile.skillsToLearn || [],
    careerGoals: (profile.careerGoals || []).map(String),
  });

  return createHash('sha1').update(payload).digest('hex').slice(0, 16);
}

function buildEventFingerprint(eventRow: Record<string, unknown>): string {
  const payload = JSON.stringify({
    updatedAt: eventRow.updated_at ?? null,
    title: eventRow.title ?? '',
    startTime: eventRow.start_time ?? null,
    endTime: eventRow.end_time ?? null,
    organizer: eventRow.organizer_name ?? '',
  });

  return createHash('sha1').update(payload).digest('hex').slice(0, 12);
}

function getCacheKey(
  userId: string,
  eventId: string,
  profileFingerprint: string,
  eventFingerprint: string
): string {
  return `${JUSTIFICATION_CACHE_PREFIX}:${userId}:${eventId}:${profileFingerprint}:${eventFingerprint}`;
}

async function getCachedJustification(
  cacheKey: string
): Promise<ManagerJustificationData | null> {
  // Cast kept intentionally: unit tests mock `kv` as a partial object.
  const kvClient = kv as unknown as {
    get?: <T>(key: string) => Promise<T | null>;
  };

  if (typeof kvClient.get !== 'function') {
    return null;
  }

  try {
    return await withTimeout(
      kvClient.get<ManagerJustificationData>(cacheKey),
      CACHE_IO_TIMEOUT_MS,
      null
    );
  } catch (error) {
    console.warn('[ManagerJustification] Failed to read cache:', error);
    return null;
  }
}

async function setCachedJustification(
  cacheKey: string,
  data: ManagerJustificationData
): Promise<void> {
  // Cast kept intentionally: unit tests mock `kv` as a partial object.
  const kvClient = kv as unknown as {
    set?: (key: string, value: unknown, options?: { ex?: number }) => Promise<unknown>;
  };

  if (typeof kvClient.set !== 'function') {
    return;
  }

  try {
    await withTimeout(
      kvClient.set(cacheKey, data, { ex: JUSTIFICATION_CACHE_TTL_SECONDS }),
      CACHE_IO_TIMEOUT_MS,
      null
    );
  } catch (error) {
    console.warn('[ManagerJustification] Failed to write cache:', error);
  }
}

function buildFallbackScoredEvent(
  event: Event,
  careerProfile: CareerProfile
): EventWithCareerImpact {
  const alignment = calculateBaseScore(event, careerProfile);
  const reasons = alignment.alignmentReasons
    .map((reason) => reason.reason)
    .filter(Boolean);

  return {
    ...event,
    isCareerScored: true,
    careerImpact: {
      overall: alignment.overall,
      confidence: 0.65,
      components: {
        skillRelevance: alignment.components.skillRelevance ?? 0,
        careerStageMatch: alignment.components.careerStageMatch ?? 0,
        networkingValue: alignment.components.networkingValue ?? 0,
        industryRelevance: alignment.components.industryRelevance ?? 0,
        timingBonus: alignment.components.timingBonus ?? 0,
      },
      explanation: {
        reasons: reasons.length > 0 ? reasons : ['Strong alignment with your current role and growth goals.'],
        matchedSkills: alignment.matchedSkills ?? [],
        matchedGoals: alignment.matchedGoals ?? [],
        speakerHighlights: [],
        careerImpactCategory: getAlignmentCategory(alignment.overall),
        confidenceFactors: ['Fast fallback scoring path'],
      },
      metadata: {
        algorithmVersion: 'alignment-core-v1-fallback',
        calculatedAt: new Date().toISOString(),
        careerProfileHash: 'manager-justification-fallback',
        eventDataHash: event.id,
      },
    },
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ManagerJustificationResponse>> {
  try {
    const supabase = await createClient();
    const { id: eventId } = await params;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonNoStore({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const onboardingGuard = await requireOnboardedApi(supabase, user.id);
    if (onboardingGuard) {
      return withNoStore(onboardingGuard as NextResponse<ManagerJustificationResponse>);
    }

    const { success: rateLimitSuccess } = await withTimeout(
      ratelimit.limit(user.id).catch((error) => {
        console.warn('[ManagerJustification] Rate limit check failed open:', error);
        return { success: true };
      }),
      RATE_LIMIT_TIMEOUT_MS,
      { success: true }
    );
    if (!rateLimitSuccess) {
      return jsonNoStore(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const eventAndProfile = await withTimeout(
      Promise.all([
        supabase
          .from('events_detailed')
          .select(EVENT_SELECT_COLUMNS)
          .eq('id', eventId)
          .single(),
        CareerProfileService.getCareerProfile(user.id, supabase),
      ])
        .then(([eventQueryResult, careerProfile]) => ({ eventQueryResult, careerProfile }))
        .catch((error) => {
          console.error('[ManagerJustification] Failed during event/profile fetch:', error);
          return null;
        }),
      DATA_FETCH_TIMEOUT_MS,
      null
    );

    if (!eventAndProfile) {
      return jsonNoStore(
        { success: false, error: 'Request timed out. Please try again.' },
        { status: 504 }
      );
    }
    const { eventQueryResult, careerProfile } = eventAndProfile;

    const { data: eventRow, error: eventError } = eventQueryResult;

    if (eventError?.code === 'PGRST116') {
      return jsonNoStore({ success: false, error: 'Event not found' }, { status: 404 });
    }

    if (eventError) {
      console.error('[ManagerJustification] Failed to fetch event row:', eventError);
      return jsonNoStore(
        { success: false, error: 'Failed to fetch event details' },
        { status: 500 }
      );
    }

    if (!eventRow) {
      return jsonNoStore({ success: false, error: 'Event not found' }, { status: 404 });
    }

    if (!careerProfile) {
      return jsonNoStore(
        {
          success: false,
          error: 'Career profile required. Please complete onboarding.',
        },
        { status: 422 }
      );
    }

    const rawEventRow = eventRow as unknown as Record<string, unknown>;
    const profileFingerprint = buildProfileFingerprint(careerProfile);
    const eventFingerprint = buildEventFingerprint(rawEventRow);
    const cacheKey = getCacheKey(user.id, eventId, profileFingerprint, eventFingerprint);
    const cachedData = await getCachedJustification(cacheKey);
    if (cachedData) {
      return jsonNoStore({ success: true, data: cachedData });
    }

    const event = eventDetailedTransformer.toApp(rawEventRow);
    const enriched = await withTimeout(
      rankEventsWithCanonicalPipeline({
        events: [event],
        careerProfile,
        supabaseClient: supabase,
        userId: user.id,
      })
        .then((events) => events[0] as EventWithCareerImpact | undefined)
        .catch((error) => {
          console.warn('[ManagerJustification] Canonical scoring failed:', error);
          return undefined;
        }),
      SCORING_TIMEOUT_MS,
      undefined
    );

    const scoredEvent = enriched ?? buildFallbackScoredEvent(event, careerProfile);

    if (!enriched) {
      console.warn('[ManagerJustification] Canonical scoring timed out; using fast fallback scorer', {
        eventId,
        userId: user.id,
      });
    }

    if (!scoredEvent.isCareerScored || !scoredEvent.careerImpact) {
      return jsonNoStore(
        {
          success: false,
          error: 'Unable to generate career impact score. Please try again.',
        },
        { status: 422 }
      );
    }
    const impact = scoredEvent.careerImpact;

    const response: ManagerJustificationResponse = {
      success: true,
      data: {
        event: {
          title: scoredEvent.title,
          startTime: scoredEvent.startTime,
          endTime: scoredEvent.endTime,
          timezone: scoredEvent.timezone ?? null,
          location: scoredEvent.location,
          eventFormat: scoredEvent.eventFormat ?? null,
          organizer: scoredEvent.organizer,
          priceRange: scoredEvent.priceRange ?? null,
          priceMin: scoredEvent.priceMin ?? null,
          registrationUrl: scoredEvent.registrationUrl ?? null,
          description: scoredEvent.description,
          tags: scoredEvent.tags?.map((tag) => tag.name).filter(Boolean) ?? [],
          speakers: (scoredEvent.speakerLineup ?? []).map((speaker) => ({
            name: speaker.name,
            title: speaker.title ?? null,
            company: speaker.company ?? null,
          })),
          difficulty: scoredEvent.difficulty ?? null,
          targetAudience: scoredEvent.targetAudience ?? null,
        },
        profile: {
          currentRole: careerProfile.currentRole,
          seniority: careerProfile.seniority,
          industry: careerProfile.industry,
          primarySkills: careerProfile.primarySkills ?? [],
          skillsToLearn: careerProfile.skillsToLearn ?? [],
          careerGoals: (careerProfile.careerGoals ?? []).map(String),
        },
        impact: {
          overall: impact.overall,
          confidence: impact.confidence,
          components: {
            skillRelevance: impact.components.skillRelevance ?? 0,
            careerStageMatch: impact.components.careerStageMatch ?? 0,
            networkingValue: impact.components.networkingValue ?? 0,
            industryRelevance: impact.components.industryRelevance ?? 0,
            timingBonus: impact.components.timingBonus ?? 0,
          },
          topReasons: (impact.explanation.reasons ?? []).slice(0, 5),
          matchedSkills: impact.explanation.matchedSkills ?? [],
          matchedGoals: impact.explanation.matchedGoals ?? [],
        },
      },
    };

    if (response.data) {
      await setCachedJustification(cacheKey, response.data);
    }

    return jsonNoStore(response);
  } catch (error) {
    console.error('[ManagerJustification] Route error:', error);
    return jsonNoStore(
      { success: false, error: 'Failed to generate manager justification' },
      { status: 500 }
    );
  }
}
