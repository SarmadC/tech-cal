import { createHash } from 'node:crypto';

import { load } from 'cheerio';
import sharp from 'sharp';

import { fetchWithSafeRedirects } from '@/lib/ssrfProtection';
import {
  imageExtFromMimeType,
  sanitizeStoragePath,
} from '@/lib/storagePathUtils';
import type { SupabaseClientType } from '@/types';

const MIN_HERO_PORTRAIT_EDGE = 1024;
const MAX_HTML_BYTES = 2 * 1024 * 1024;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const REMOTE_FETCH_TIMEOUT_MS = 10_000;
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
]);
const SHARP_FORMAT_BY_IMAGE_TYPE = new Map([
  ['image/jpeg', 'jpeg'],
  ['image/jpg', 'jpeg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/avif', 'heif'],
]);

export type SpeakerPortraitCandidate = {
  id: string;
  speakerId: string;
  imageUrl: string;
  sourcePageUrl: string;
  sourceType: 'img' | 'srcset' | 'structured';
  width: number;
  height: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
};

type CandidateInput = Omit<SpeakerPortraitCandidate, 'id' | 'speakerId' | 'status' | 'createdAt'>;

type ValidatedPortraitImage = {
  buffer: Buffer;
  contentType: string;
  width: number;
  height: number;
};

function resolveImageUrl(value: string | undefined, sourcePageUrl: string): string | null {
  if (!value?.trim()) return null;
  try {
    const imageUrl = new URL(value.trim(), sourcePageUrl).toString();
    // The candidate must be explicitly referenced by the official page. CDN hosts
    // are allowed because many event platforms serve their own assets from them.
    return new URL(imageUrl).protocol === 'https:' ? imageUrl : null;
  } catch {
    return null;
  }
}

function parseSrcset(value: string, sourcePageUrl: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim().split(/\s+/)[0])
    .map((entry) => resolveImageUrl(entry, sourcePageUrl))
    .filter((entry): entry is string => Boolean(entry));
}

async function readResponseBuffer(
  response: Response,
  maxBytes: number
): Promise<Buffer> {
  const declaredLength = Number(response.headers.get('content-length') ?? '0');
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new Error('Remote response is too large.');
  }

  if (!response.body) {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0 || buffer.length > maxBytes) {
      throw new Error('Remote response has an invalid size.');
    }
    return buffer;
  }

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel('Remote response is too large.');
        throw new Error('Remote response is too large.');
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }

  if (totalBytes === 0) {
    throw new Error('Remote response is empty.');
  }

  return Buffer.concat(chunks, totalBytes);
}

async function downloadValidatedPortraitImage(
  imageUrl: string
): Promise<ValidatedPortraitImage | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REMOTE_FETCH_TIMEOUT_MS);
  try {
    const response = await fetchWithSafeRedirects(imageUrl, {
      headers: { Accept: 'image/avif,image/webp,image/png,image/jpeg;q=0.9' },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const contentType = (response.headers.get('content-type') ?? '').split(';')[0].toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.has(contentType)) return null;
    const buffer = await readResponseBuffer(response, MAX_IMAGE_BYTES);
    const metadata = await sharp(buffer).metadata();
    if (
      metadata.format !== SHARP_FORMAT_BY_IMAGE_TYPE.get(contentType) ||
      !metadata.width ||
      !metadata.height ||
      Math.min(metadata.width, metadata.height) < MIN_HERO_PORTRAIT_EDGE
    ) {
      return null;
    }
    return {
      buffer,
      contentType,
      width: metadata.width,
      height: metadata.height,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function candidateImageUrls(html: string, sourcePageUrl: string, speakerName: string): Array<{ imageUrl: string; sourceType: CandidateInput['sourceType'] }> {
  const $ = load(html);
  const normalizedName = speakerName.trim().toLowerCase();
  const nameParts = normalizedName.split(/\s+/).filter((part) => part.length > 2);
  const matchesName = (value: string) => nameParts.some((part) => value.toLowerCase().includes(part));
  const candidates = new Map<string, CandidateInput['sourceType']>();
  const add = (value: string | undefined, sourceType: CandidateInput['sourceType']) => {
    const imageUrl = resolveImageUrl(value, sourcePageUrl);
    if (imageUrl) candidates.set(imageUrl, sourceType);
  };

  $('img').each((_, element) => {
    const image = $(element);
    const context = [image.attr('alt'), image.parent().text(), image.closest('article, li, section, div').text()].filter(Boolean).join(' ');
    if (!matchesName(context)) return;
    add(image.attr('src'), 'img');
    for (const imageUrl of parseSrcset(image.attr('srcset') ?? '', sourcePageUrl)) candidates.set(imageUrl, 'srcset');
  });

  $('script[type="application/ld+json"]').each((_, element) => {
    const raw = $(element).text();
    if (!raw.includes(speakerName)) return;
    try {
      const payload = JSON.parse(raw) as Record<string, unknown> | Array<Record<string, unknown>>;
      const entries = Array.isArray(payload) ? payload : [payload];
      for (const entry of entries) {
        if (String(entry.name ?? '').toLowerCase() !== normalizedName) continue;
        const image = entry.image;
        if (typeof image === 'string') add(image, 'structured');
        if (Array.isArray(image)) image.filter((value): value is string => typeof value === 'string').forEach((value) => add(value, 'structured'));
      }
    } catch {
      // Ignore malformed third-party structured data.
    }
  });

  return Array.from(candidates, ([imageUrl, sourceType]) => ({ imageUrl, sourceType }));
}

export class SpeakerPortraitCandidateService {
  static async discover(params: {
    speakerId: string;
    speakerName: string;
    sourcePageUrls: string[];
    supabaseClient: SupabaseClientType;
  }): Promise<SpeakerPortraitCandidate[]> {
    const { speakerId, speakerName, sourcePageUrls, supabaseClient } = params;
    const discovered: CandidateInput[] = [];

    for (const sourcePageUrl of Array.from(new Set(sourcePageUrls.filter(Boolean)))) {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        REMOTE_FETCH_TIMEOUT_MS
      );
      try {
        const response = await fetchWithSafeRedirects(sourcePageUrl, {
          headers: { Accept: 'text/html,application/xhtml+xml' },
          signal: controller.signal,
        });
        if (!response.ok) continue;
        const html = (
          await readResponseBuffer(response, MAX_HTML_BYTES)
        ).toString('utf8');
        for (const candidate of candidateImageUrls(html, sourcePageUrl, speakerName)) {
          const image = await downloadValidatedPortraitImage(candidate.imageUrl);
          if (image) {
            discovered.push({
              ...candidate,
              sourcePageUrl,
              width: image.width,
              height: image.height,
            });
          }
        }
      } catch {
        // A source page failing discovery must not block the rest of an admin review.
      } finally {
        clearTimeout(timeout);
      }
    }

    const unique = Array.from(new Map(discovered.map((candidate) => [candidate.imageUrl, candidate])).values());
    if (unique.length > 0) {
      const { error } = await (supabaseClient as any)
        .from('speaker_portrait_candidates')
        .upsert(unique.map((candidate) => ({
          speaker_id: speakerId,
          image_url: candidate.imageUrl,
          source_page_url: candidate.sourcePageUrl,
          source_type: candidate.sourceType,
          width: candidate.width,
          height: candidate.height,
        })), { onConflict: 'speaker_id,image_url', ignoreDuplicates: true });
      if (error) throw new Error(`Failed to store portrait candidates: ${error.message}`);
    }

    return this.list({ speakerId, supabaseClient });
  }

  static async list(params: { speakerId: string; supabaseClient: SupabaseClientType }): Promise<SpeakerPortraitCandidate[]> {
    const { data, error } = await (params.supabaseClient as any)
      .from('speaker_portrait_candidates')
      .select('id, speaker_id, image_url, source_page_url, source_type, width, height, status, created_at')
      .eq('speaker_id', params.speakerId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(`Failed to load portrait candidates: ${error.message}`);
    return (data ?? []).map((row: any) => ({
      id: row.id,
      speakerId: row.speaker_id,
      imageUrl: row.image_url,
      sourcePageUrl: row.source_page_url,
      sourceType: row.source_type,
      width: row.width,
      height: row.height,
      status: row.status,
      createdAt: row.created_at,
    }));
  }

  static async review(params: { candidateId: string; action: 'approve' | 'reject'; reviewerId: string; supabaseClient: SupabaseClientType }): Promise<void> {
    const { data: candidate, error } = await (params.supabaseClient as any)
      .from('speaker_portrait_candidates')
      .select('id, speaker_id, image_url, width, height, status')
      .eq('id', params.candidateId)
      .single();
    if (error || !candidate) throw new Error('Portrait candidate was not found.');
    if (candidate.status !== 'pending') throw new Error('Portrait candidate has already been reviewed.');

    let publishedUrl: string | null = null;
    let publishedWidth: number | null = null;
    let publishedHeight: number | null = null;
    if (params.action === 'approve') {
      const image = await downloadValidatedPortraitImage(candidate.image_url);
      if (!image) {
        throw new Error(
          `The portrait must still be an approved raster format and at least ${MIN_HERO_PORTRAIT_EDGE}px on the short edge.`
        );
      }

      const key = createHash('sha256').update(candidate.image_url).digest('hex').slice(0, 16);
      const filePath = sanitizeStoragePath(
        `speaker-profile-photos/approved/${candidate.speaker_id}-${key}.${imageExtFromMimeType(image.contentType)}`
      );
      const { error: uploadError } = await params.supabaseClient.storage
        .from('avatars')
        .upload(filePath, image.buffer, {
          cacheControl: '31536000',
          contentType: image.contentType,
          upsert: true,
        });
      if (uploadError) {
        throw new Error(`Unable to store the approved portrait: ${uploadError.message}`);
      }

      const { data: publicUrlData } = params.supabaseClient.storage
        .from('avatars')
        .getPublicUrl(filePath);
      publishedUrl = publicUrlData.publicUrl;
      publishedWidth = image.width;
      publishedHeight = image.height;
    }

    const { error: reviewError } = await (params.supabaseClient as any).rpc(
      'review_speaker_portrait_candidate',
      {
        p_action: params.action,
        p_candidate_id: params.candidateId,
        p_portrait_height: publishedHeight,
        p_portrait_url: publishedUrl,
        p_portrait_width: publishedWidth,
        p_reviewer_id: params.reviewerId,
      }
    );
    if (reviewError) {
      const alreadyReviewed =
        reviewError.message?.includes('portrait_candidate_already_reviewed');
      throw new Error(
        alreadyReviewed
          ? 'Portrait candidate has already been reviewed.'
          : `Failed to review portrait candidate: ${reviewError.message}`
      );
    }
  }
}
