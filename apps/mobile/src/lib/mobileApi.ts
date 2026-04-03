import {
  mobileDashboardSummarySchema,
  mobileDiscoverFeedRequestSchema,
  mobileDiscoverFeedSchema,
  mobileEventDetailSchema,
  type MobileDashboardSummary,
  type MobileDiscoverFeed,
  type MobileDiscoverFeedRequest,
  type MobileEventDetail,
} from '@kurecal/domain';
import type { ZodType } from 'zod';

import { getMobileApiBaseUrl } from './env';
import { supabase } from './supabase';

interface MobileApiEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: string;
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
