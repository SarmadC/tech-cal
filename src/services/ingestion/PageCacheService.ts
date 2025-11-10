import type { SupabaseClientType } from '@/types';
import type { Database } from '@/types/supabase';
import type { HtmlCoreExtractionResult } from './html';
import type { ExtractedEventData } from '@/types/firecrawl';

type PageCacheRow = Database['public']['Tables']['page_cache']['Row'];
type PageCacheInsert = Database['public']['Tables']['page_cache']['Insert'];

export interface CachedExtractionPayload {
    htmlResult: HtmlCoreExtractionResult;
    extractedEvent: ExtractedEventData;
    fieldConfidence: Record<string, number>;
    confidence: number;
    provenance: HtmlCoreExtractionResult['provenance'];
    normalizedUrlHash?: string;
}

export class PageCacheService {
    static async get(
        supabaseClient: SupabaseClientType,
        normalizedUrl: string
    ): Promise<PageCacheRow | null> {
        const { data, error } = await supabaseClient
            .from('page_cache')
            .select('*')
            .eq('normalized_url', normalizedUrl)
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.warn('[PageCacheService] Failed to load cache entry:', error);
            return null;
        }

        if (data) {
            await supabaseClient
                .from('page_cache')
                .update({ last_seen_at: new Date().toISOString() })
                .eq('id', data.id);
        }

        return data ?? null;
    }

    static isExpired(entry: PageCacheRow | null): boolean {
        if (!entry) return true;
        if (!entry.expires_at) return false;
        const expiresAt = new Date(entry.expires_at);
        return Number.isNaN(expiresAt.getTime()) ? false : expiresAt.getTime() < Date.now();
    }

    static calculateExpiry(startTime?: string | null): Date {
        const now = Date.now();
        const DAY = 24 * 60 * 60 * 1000;

        if (!startTime) {
            return new Date(now + 3 * DAY);
        }

        const start = new Date(startTime);
        if (Number.isNaN(start.getTime())) {
            return new Date(now + 3 * DAY);
        }

        const diff = start.getTime() - now;

        if (diff < -DAY) {
            // Event already passed - keep cache for 30 days
            return new Date(now + 30 * DAY);
        }

        if (diff <= 7 * DAY) {
            return new Date(now + DAY);
        }

        return new Date(now + 7 * DAY);
    }

    static async upsert(
        supabaseClient: SupabaseClientType,
        params: {
            normalizedUrl: string;
            sourceDomain?: string | null;
            statusCode?: number;
            rawHtml?: string;
            extracted?: CachedExtractionPayload;
            fetchMetadata?: Record<string, unknown>;
            contentHash: string;
            expiresAt: Date;
            etag?: string | null;
            lastModified?: string | null;
        }
    ): Promise<void> {
        const insert: PageCacheInsert = {
            normalized_url: params.normalizedUrl,
            source_domain: params.sourceDomain ?? null,
            status_code: params.statusCode ?? null,
            raw_html: params.rawHtml ?? null,
            extracted: params.extracted ? params.extracted as unknown as Database['public']['Tables']['page_cache']['Insert']['extracted'] : null,
            fetch_metadata: params.fetchMetadata ? (params.fetchMetadata as unknown as Database['public']['Tables']['page_cache']['Insert']['fetch_metadata']) : null,
            content_hash: params.contentHash,
            expires_at: params.expiresAt.toISOString(),
            fetched_at: new Date().toISOString(),
            last_seen_at: new Date().toISOString(),
            etag: params.etag ?? null,
            last_modified: params.lastModified ?? null,
        };

        const { error } = await supabaseClient
            .from('page_cache')
            .upsert(insert, { onConflict: 'normalized_url' });

        if (error) {
            console.warn('[PageCacheService] Failed to upsert cache entry:', error);
        }
    }
}

