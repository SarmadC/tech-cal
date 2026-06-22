import { createHash } from 'node:crypto';

import * as Sentry from '@sentry/nextjs';
import pLimit from 'p-limit';

import { fetchWithSafeRedirects } from '@/lib/ssrfProtection';
import { sanitizeStoragePath } from '@/lib/storagePathUtils';
import type { SupabaseClientType } from '@/types';

const AVATAR_BUCKET = 'avatars';
const SPEAKER_AVATAR_PREFIX = 'speakers/';
const MANUAL_SPEAKER_PROFILE_PHOTO_PREFIX = 'speaker-profile-photos/';
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const MIN_REAL_AVATAR_BYTES = 1_500;
const DEFAULT_BACKFILL_LIMIT = 100;
const DEFAULT_SCAN_BATCH_SIZE = 200;
const DEFAULT_CONCURRENCY = 3;
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 2_000;
const SUPPORTED_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/avif',
  'image/gif',
]);
const KNOWN_GENERIC_LINKEDIN_AVATAR_HASHES = new Set([
  // Unavatar's LinkedIn fallback logo for missing/unavailable LinkedIn profiles.
  'eda6fe05a8638d28efe6d27dd867cff3259854a02403e234c6a7677db5ad564a',
]);

export interface SpeakerAvatarCandidate {
  id: string;
  name: string;
  linkedinUrl: string | null;
  currentPhotoUrl: string | null;
}

export interface CacheSpeakerAvatarResult {
  speakerId: string;
  status: 'cached' | 'skipped' | 'failed';
  reason?: string;
  avatarUrl?: string;
}

export interface BackfillSpeakerAvatarSummary {
  scanned: number;
  eligible: number;
  processed: number;
  cached: number;
  skipped: number;
  failed: number;
  results: CacheSpeakerAvatarResult[];
}

type SpeakerAvatarRow = {
  id: string;
  name: string | null;
  linkedin_url: string | null;
  photo_url: string | null;
};

function normalizeLinkedInUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }

    const hostname = parsed.hostname.toLowerCase();
    if (!hostname.endsWith('linkedin.com')) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

function normalizeContentType(value: string | null): string {
  return (value || '').split(';')[0].trim().toLowerCase();
}

function extensionFromContentType(contentType: string): string {
  switch (contentType) {
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    case 'image/avif':
      return 'avif';
    case 'image/gif':
      return 'gif';
    case 'image/png':
    default:
      return 'png';
  }
}

async function sha256Blob(blob: Blob): Promise<string> {
  const buffer = Buffer.from(await blob.arrayBuffer());
  return createHash('sha256').update(buffer).digest('hex');
}

export class SpeakerAvatarCacheService {
  static isCachedSpeakerAvatarUrl(value: string | null | undefined): boolean {
    const trimmed = value?.trim();
    if (!trimmed) {
      return false;
    }

    if (trimmed.startsWith(`${SPEAKER_AVATAR_PREFIX}`)) {
      return true;
    }

    try {
      const parsed = new URL(trimmed);
      return parsed.pathname.includes(`/storage/v1/object/public/${AVATAR_BUCKET}/${SPEAKER_AVATAR_PREFIX}`);
    } catch {
      return trimmed.includes(`${AVATAR_BUCKET}/${SPEAKER_AVATAR_PREFIX}`);
    }
  }

  static isManualSpeakerProfilePhotoUrl(value: string | null | undefined): boolean {
    const trimmed = value?.trim();
    if (!trimmed) {
      return false;
    }

    if (trimmed.startsWith(MANUAL_SPEAKER_PROFILE_PHOTO_PREFIX)) {
      return true;
    }

    try {
      const parsed = new URL(trimmed);
      return parsed.pathname.includes(`/storage/v1/object/public/${AVATAR_BUCKET}/${MANUAL_SPEAKER_PROFILE_PHOTO_PREFIX}`);
    } catch {
      return trimmed.includes(`${AVATAR_BUCKET}/${MANUAL_SPEAKER_PROFILE_PHOTO_PREFIX}`);
    }
  }

  static shouldPopulatePhotoUrl(currentPhotoUrl: string | null | undefined): boolean {
    const trimmed = currentPhotoUrl?.trim();
    if (this.isManualSpeakerProfilePhotoUrl(trimmed)) {
      return false;
    }

    return !trimmed || this.isCachedSpeakerAvatarUrl(trimmed);
  }

  static buildResolverUrl(linkedinUrl: string): string {
    return `https://unavatar.io/${encodeURIComponent(linkedinUrl)}`;
  }

  private static buildCachedPath(speakerId: string, linkedinUrl: string, contentType: string): string {
    const hash = createHash('sha256')
      .update(linkedinUrl.trim().toLowerCase())
      .digest('hex')
      .slice(0, 12);

    return `${SPEAKER_AVATAR_PREFIX}${speakerId}-${hash}.${extensionFromContentType(contentType)}`;
  }

  private static async downloadAvatarBlob(linkedinUrl: string): Promise<{
    blob: Blob;
    contentType: string;
  }> {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8_000);

      try {
        const response = await fetchWithSafeRedirects(
          this.buildResolverUrl(linkedinUrl),
          {
            method: 'GET',
            headers: {
              Accept: 'image/*,*/*;q=0.8',
              'User-Agent': 'KureCal Speaker Avatar Cache/1.0',
            },
            signal: controller.signal,
          }
        );

        if (response.status === 429 && attempt < MAX_RETRIES) {
          const retryAfter = Number(response.headers.get('retry-after') || '0') * 1_000;
          const backoff = retryAfter || INITIAL_BACKOFF_MS * Math.pow(2, attempt);
          console.warn(`[SpeakerAvatarCacheService] Rate limited, retrying in ${backoff}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
          await new Promise((resolve) => setTimeout(resolve, backoff));
          continue;
        }

        if (!response.ok) {
          throw new Error(`Avatar resolver returned ${response.status}`);
        }

        const contentType = normalizeContentType(response.headers.get('content-type'));
        if (!contentType.startsWith('image/') || !SUPPORTED_IMAGE_TYPES.has(contentType)) {
          throw new Error(`Unsupported avatar content type: ${contentType || 'unknown'}`);
        }

        const contentLength = Number(response.headers.get('content-length') || '0');
        if (contentLength > MAX_AVATAR_BYTES) {
          throw new Error('Avatar exceeds 5MB limit');
        }

        const blob = await response.blob();
        if (blob.size === 0) {
          throw new Error('Avatar download returned an empty file');
        }

        if (blob.size > MAX_AVATAR_BYTES) {
          throw new Error('Avatar exceeds 5MB limit');
        }

        await this.assertLooksLikeRealAvatar(blob);

        return { blob, contentType };
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new Error('Avatar resolver returned 429 after all retries');
  }

  static async assertLooksLikeRealAvatar(blob: Blob): Promise<void> {
    if (blob.size < MIN_REAL_AVATAR_BYTES) {
      throw new Error('Avatar resolver returned a generic or too-small image');
    }

    const hash = await sha256Blob(blob);
    if (KNOWN_GENERIC_LINKEDIN_AVATAR_HASHES.has(hash)) {
      throw new Error('Avatar resolver returned a known generic LinkedIn fallback image');
    }
  }

  static async cacheSpeakerAvatar(params: {
    speaker: SpeakerAvatarCandidate;
    supabaseClient: SupabaseClientType;
    forceRefresh?: boolean;
  }): Promise<CacheSpeakerAvatarResult> {
    const { speaker, supabaseClient, forceRefresh = false } = params;
    const linkedinUrl = normalizeLinkedInUrl(speaker.linkedinUrl);

    if (!linkedinUrl) {
      return {
        speakerId: speaker.id,
        status: 'skipped',
        reason: 'Missing or invalid LinkedIn URL',
      };
    }

    if (this.isManualSpeakerProfilePhotoUrl(speaker.currentPhotoUrl)) {
      return {
        speakerId: speaker.id,
        status: 'skipped',
        reason: 'Manual speaker profile photo preserved',
      };
    }

    if (!forceRefresh && !this.shouldPopulatePhotoUrl(speaker.currentPhotoUrl)) {
      return {
        speakerId: speaker.id,
        status: 'skipped',
        reason: 'Existing non-cached photo preserved',
      };
    }

    try {
      const { blob, contentType } = await this.downloadAvatarBlob(linkedinUrl);
      const filePath = sanitizeStoragePath(this.buildCachedPath(speaker.id, linkedinUrl, contentType));

      const { error: uploadError } = await supabaseClient.storage
        .from(AVATAR_BUCKET)
        .upload(filePath, blob, {
          cacheControl: '3600',
          contentType,
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Failed to upload cached avatar: ${uploadError.message}`);
      }

      const { data: urlData } = supabaseClient.storage
        .from(AVATAR_BUCKET)
        .getPublicUrl(filePath);
      const avatarUrl = urlData.publicUrl;

      const { error: updateError } = await supabaseClient
        .from('speakers')
        .update({ photo_url: avatarUrl })
        .eq('id', speaker.id);

      if (updateError) {
        throw new Error(`Failed to persist cached avatar: ${updateError.message}`);
      }

      return {
        speakerId: speaker.id,
        status: 'cached',
        avatarUrl,
      };
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : 'Unknown avatar caching error';
      console.warn('[SpeakerAvatarCacheService] Failed to cache speaker avatar', {
        speakerId: speaker.id,
        linkedinUrl,
        reason,
      });
      Sentry.captureException(error, {
        extra: {
          function: 'SpeakerAvatarCacheService.cacheSpeakerAvatar',
          speakerId: speaker.id,
          linkedinUrl,
        },
      });

      return {
        speakerId: speaker.id,
        status: 'failed',
        reason,
      };
    }
  }

  static async cacheSpeakerAvatarsBatch(params: {
    speakers: SpeakerAvatarCandidate[];
    supabaseClient: SupabaseClientType;
    concurrency?: number;
    forceRefresh?: boolean;
  }): Promise<CacheSpeakerAvatarResult[]> {
    const {
      speakers,
      supabaseClient,
      concurrency = DEFAULT_CONCURRENCY,
      forceRefresh = false,
    } = params;
    const limiter = pLimit(Math.max(1, concurrency));

    return Promise.all(
      speakers.map((speaker) =>
        limiter(() =>
          this.cacheSpeakerAvatar({
            speaker,
            supabaseClient,
            forceRefresh,
          })
        )
      )
    );
  }

  static async backfillLinkedInSpeakerAvatars(params: {
    supabaseClient: SupabaseClientType;
    limit?: number;
    scanBatchSize?: number;
    concurrency?: number;
    dryRun?: boolean;
    forceRefresh?: boolean;
  }): Promise<BackfillSpeakerAvatarSummary> {
    const {
      supabaseClient,
      limit = DEFAULT_BACKFILL_LIMIT,
      scanBatchSize = DEFAULT_SCAN_BATCH_SIZE,
      concurrency = DEFAULT_CONCURRENCY,
      dryRun = false,
      forceRefresh = false,
    } = params;

    const eligibleSpeakers: SpeakerAvatarCandidate[] = [];
    let scanned = 0;
    let offset = 0;

    while (eligibleSpeakers.length < limit) {
      const { data, error } = await supabaseClient
        .from('speakers')
        .select('id, name, linkedin_url, photo_url')
        .not('linkedin_url', 'is', null)
        .order('id', { ascending: true })
        .range(offset, offset + scanBatchSize - 1);

      if (error) {
        throw new Error(`Failed to load speaker backfill batch: ${error.message}`);
      }

      const rows = (data ?? []) as SpeakerAvatarRow[];
      if (rows.length === 0) {
        break;
      }

      scanned += rows.length;

      for (const row of rows) {
        if (!forceRefresh && !this.shouldPopulatePhotoUrl(row.photo_url)) {
          continue;
        }

        eligibleSpeakers.push({
          id: row.id,
          name: row.name?.trim() || 'Speaker',
          linkedinUrl: row.linkedin_url,
          currentPhotoUrl: row.photo_url,
        });

        if (eligibleSpeakers.length >= limit) {
          break;
        }
      }

      offset += rows.length;

      if (rows.length < scanBatchSize) {
        break;
      }
    }

    if (dryRun) {
      return {
        scanned,
        eligible: eligibleSpeakers.length,
        processed: 0,
        cached: 0,
        skipped: 0,
        failed: 0,
        results: [],
      };
    }

    const results = await this.cacheSpeakerAvatarsBatch({
      speakers: eligibleSpeakers,
      supabaseClient,
      concurrency,
      forceRefresh,
    });

    return {
      scanned,
      eligible: eligibleSpeakers.length,
      processed: results.length,
      cached: results.filter((item) => item.status === 'cached').length,
      skipped: results.filter((item) => item.status === 'skipped').length,
      failed: results.filter((item) => item.status === 'failed').length,
      results,
    };
  }
}
