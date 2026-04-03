import {
  mobileCareerOnboardingBootstrapSchema,
  mobileCareerOnboardingDataSchema,
  mobileEventDetailSchema,
  mobileEventEngagementSchema,
  mobileEventEngagementUpdateSchema,
  mobileOnboardingStatusSchema,
  mobileProfileStateSchema,
  mobileProfileUpdateSchema,
  mobileSavedEventsFeedSchema,
  mobileDashboardSummarySchema,
  mobileDiscoverFeedRequestSchema,
  mobileDiscoverFeedSchema,
  type MobileCareerOnboardingBootstrap,
  type MobileCareerOnboardingData,
  type MobileDashboardSummary,
  type MobileDiscoverFeed,
  type MobileDiscoverFeedRequest,
  type MobileEventDetail,
  type MobileEventEngagement,
  type MobileEventEngagementUpdate,
  type MobileOnboardingStatus,
  type MobileProfileState,
  type MobileProfileUpdate,
  type MobileSavedEventsFeed,
} from '@kurecal/domain';
import type { ZodType } from 'zod';

import { getMobileApiBaseUrl } from './env';
import { supabase } from './supabase';

interface MobileApiEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: string;
}

function getDeviceTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

async function getAccessToken(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const accessToken = session?.access_token?.trim();
  if (!accessToken) {
    throw new Error('Sign in required');
  }

  return accessToken;
}

async function fetchMobileContract<T>(
  path: string,
  schema: ZodType<T>,
  init?: RequestInit
): Promise<T> {
  const accessToken = await getAccessToken();
  const headers = new Headers(init?.headers);

  headers.set('Authorization', `Bearer ${accessToken}`);
  const timezone = getDeviceTimezone();
  if (timezone && !headers.has('x-timezone')) {
    headers.set('x-timezone', timezone);
  }
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${getMobileApiBaseUrl()}${path}`, {
    ...init,
    headers,
  });

  const payload = (await response
    .json()
    .catch(() => ({}))) as MobileApiEnvelope<unknown>;

  if (!response.ok || !payload.success || payload.data == null) {
    throw new Error(payload.error || 'Mobile request failed');
  }

  return schema.parse(payload.data);
}

export async function loadMobileDashboardSummary(): Promise<MobileDashboardSummary> {
  return fetchMobileContract(
    '/api/mobile/dashboard/summary',
    mobileDashboardSummarySchema
  );
}

export async function loadMobileDiscoverFeed(
  input: MobileDiscoverFeedRequest
): Promise<MobileDiscoverFeed> {
  const payload = mobileDiscoverFeedRequestSchema.parse(input);

  return fetchMobileContract('/api/mobile/discover', mobileDiscoverFeedSchema, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function loadMobileSavedEvents(
  page = 1
): Promise<MobileSavedEventsFeed> {
  if (!Number.isFinite(page) || page < 1) {
    throw new Error('Page must be positive');
  }

  return fetchMobileContract(
    `/api/mobile/saved?page=${encodeURIComponent(String(page))}`,
    mobileSavedEventsFeedSchema
  );
}

export async function loadMobileEventDetail(
  eventId: string
): Promise<MobileEventDetail> {
  if (!eventId.trim()) {
    throw new Error('Event id is required');
  }

  return fetchMobileContract(
    `/api/mobile/events/${encodeURIComponent(eventId.trim())}`,
    mobileEventDetailSchema
  );
}

export async function updateMobileEventEngagement(
  eventId: string,
  input: MobileEventEngagementUpdate
): Promise<MobileEventEngagement> {
  if (!eventId.trim()) {
    throw new Error('Event id is required');
  }

  const payload = mobileEventEngagementUpdateSchema.parse(input);

  return fetchMobileContract(
    `/api/mobile/events/${encodeURIComponent(eventId.trim())}/engagement`,
    mobileEventEngagementSchema,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }
  );
}

export async function loadMobileProfileState(): Promise<MobileProfileState> {
  return fetchMobileContract('/api/mobile/profile', mobileProfileStateSchema);
}

export async function updateMobileProfile(
  input: MobileProfileUpdate
): Promise<MobileProfileState> {
  const payload = mobileProfileUpdateSchema.parse(input);

  return fetchMobileContract('/api/mobile/profile', mobileProfileStateSchema, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function loadMobileCareerOnboardingBootstrap(): Promise<MobileCareerOnboardingBootstrap> {
  return fetchMobileContract(
    '/api/mobile/onboarding/career',
    mobileCareerOnboardingBootstrapSchema
  );
}

export async function completeMobileCareerOnboarding(
  data: MobileCareerOnboardingData
): Promise<MobileOnboardingStatus> {
  const payload = mobileCareerOnboardingDataSchema.parse(data);

  return fetchMobileContract(
    '/api/mobile/onboarding/career',
    mobileOnboardingStatusSchema,
    {
      method: 'POST',
      body: JSON.stringify({
        action: 'complete',
        data: payload,
      }),
    }
  );
}

export async function skipMobileCareerOnboarding(): Promise<MobileOnboardingStatus> {
  return fetchMobileContract(
    '/api/mobile/onboarding/career',
    mobileOnboardingStatusSchema,
    {
      method: 'POST',
      body: JSON.stringify({
        action: 'skip',
      }),
    }
  );
}
