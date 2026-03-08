#!/usr/bin/env tsx
/**
 * Backfill ingestion cleanup issues in source_events and events.
 *
 * Default mode is dry-run.
 * Usage:
 *   npm run fix-techmeme-urls
 *   npm run fix-techmeme-urls -- --apply
 *   npm run fix-techmeme-urls -- --apply --limit=500 --batch=100
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import type { EventSourceRecord } from '@/types/ingestion';
import type { Json } from '@/types';
import { createServiceClient } from '@/utils/supabase/service';
import { OrganizerEnrichmentService } from '@/services/ingestion/OrganizerEnrichmentService';
import { applyIngestionRecordCleanup } from '@/services/ingestion/utils/recordCleanup';
import { normalizeUrlForCaching } from '@/services/ingestion/utils/urlCanonicalizer';
import {
    humanizeOrganizerNameFromDomain,
    normalizeLocationValue,
    resolveTechmemeUrl,
} from '@/utils/ingestion/sourceCleanup';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });
config();

type JsonRecord = Record<string, unknown>;

type SourceEventRow = {
    id: string;
    raw_payload: {
        record?: EventSourceRecord;
        provenance?: JsonRecord;
        rawItem?: unknown;
    } | null;
};

type EventRow = {
    id: string;
    source_url: string | null;
    registration_url: string | null;
    location: string | null;
    organizer_id: string | null;
    ingestion_source_id: string | null;
    ingestion_provenance: JsonRecord | null;
};

type Stats = {
    scanned: number;
    changed: number;
    urlFixes: number;
    locationFixes: number;
    organizerFixes: number;
};

const APPLY = process.argv.includes('--apply');
const rawLimit = process.argv.find((arg) => arg.startsWith('--limit='))?.split('=')[1];
const LIMIT = rawLimit ? parseInt(rawLimit, 10) : null;
const BATCH_SIZE = parseInt(
    process.argv.find((arg) => arg.startsWith('--batch='))?.split('=')[1] ?? '100',
    10
);

function hasChanged(before: unknown, after: unknown): boolean {
    return JSON.stringify(before) !== JSON.stringify(after);
}

function increment(stats: Stats, changeSet: { url: boolean; location: boolean; organizer: boolean }): void {
    if (changeSet.url) {
        stats.urlFixes++;
    }
    if (changeSet.location) {
        stats.locationFixes++;
    }
    if (changeSet.organizer) {
        stats.organizerFixes++;
    }
}

async function processSourceEvents(): Promise<Stats> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing Supabase credentials');
    }

    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey);
    const stats: Stats = { scanned: 0, changed: 0, urlFixes: 0, locationFixes: 0, organizerFixes: 0 };

    for (let offset = 0; ; offset += BATCH_SIZE) {
        if (LIMIT !== null && offset >= LIMIT) {
            break;
        }

        const upperBound = LIMIT === null
            ? offset + BATCH_SIZE - 1
            : Math.min(offset + BATCH_SIZE - 1, LIMIT - 1);
        const { data, error } = await supabase
            .from('source_events')
            .select('id, raw_payload')
            .order('created_at', { ascending: true })
            .range(offset, upperBound);

        if (error) {
            throw new Error(`Failed to fetch source_events: ${error.message}`);
        }

        const rows = (data ?? []) as SourceEventRow[];
        if (rows.length === 0) {
            break;
        }

        for (const row of rows) {
            stats.scanned++;

            const rawPayload = row.raw_payload;
            const record = rawPayload?.record;
            if (!rawPayload || !record) {
                continue;
            }

            const beforeSnapshot = {
                sourceUrl: record.sourceUrl,
                registrationUrl: record.registrationUrl,
                location: record.location,
                organizer: record.organizer,
                organizerDomain: record.organizerDomain,
                normalizedSourceUrl: record.normalizedSourceUrl,
                normalizedRegistrationUrl: record.normalizedRegistrationUrl,
                sourceDomain: record.sourceDomain,
                provenance: record.provenance,
            };

            const nextRecord = structuredClone(record);
            applyIngestionRecordCleanup(nextRecord);

            const afterSnapshot = {
                sourceUrl: nextRecord.sourceUrl,
                registrationUrl: nextRecord.registrationUrl,
                location: nextRecord.location,
                organizer: nextRecord.organizer,
                organizerDomain: nextRecord.organizerDomain,
                normalizedSourceUrl: nextRecord.normalizedSourceUrl,
                normalizedRegistrationUrl: nextRecord.normalizedRegistrationUrl,
                sourceDomain: nextRecord.sourceDomain,
                provenance: nextRecord.provenance,
            };

            if (!hasChanged(beforeSnapshot, afterSnapshot)) {
                continue;
            }

            const changeSet = {
                url:
                    beforeSnapshot.sourceUrl !== afterSnapshot.sourceUrl ||
                    beforeSnapshot.registrationUrl !== afterSnapshot.registrationUrl ||
                    beforeSnapshot.normalizedSourceUrl !== afterSnapshot.normalizedSourceUrl ||
                    beforeSnapshot.normalizedRegistrationUrl !== afterSnapshot.normalizedRegistrationUrl,
                location: beforeSnapshot.location !== afterSnapshot.location,
                organizer:
                    beforeSnapshot.organizer !== afterSnapshot.organizer ||
                    beforeSnapshot.organizerDomain !== afterSnapshot.organizerDomain,
            };

            stats.changed++;
            increment(stats, changeSet);

            if (!APPLY) {
                continue;
            }

            const updatedPayload = {
                ...rawPayload,
                record: nextRecord,
                provenance: nextRecord.provenance,
            };

            const { error: updateError } = await supabase
                .from('source_events')
                .update({ raw_payload: updatedPayload as unknown as Json })
                .eq('id', row.id);

            if (updateError) {
                throw new Error(`Failed to update source_event ${row.id}: ${updateError.message}`);
            }
        }
    }

    return stats;
}

async function processEvents(): Promise<Stats> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing Supabase credentials');
    }

    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey);
    const stats: Stats = { scanned: 0, changed: 0, urlFixes: 0, locationFixes: 0, organizerFixes: 0 };

    for (let offset = 0; ; offset += BATCH_SIZE) {
        if (LIMIT !== null && offset >= LIMIT) {
            break;
        }

        const upperBound = LIMIT === null
            ? offset + BATCH_SIZE - 1
            : Math.min(offset + BATCH_SIZE - 1, LIMIT - 1);
        const { data, error } = await supabase
            .from('events')
            .select('id, source_url, registration_url, location, organizer_id, ingestion_source_id, ingestion_provenance')
            .not('ingestion_source_id', 'is', null)
            .order('created_at', { ascending: true })
            .range(offset, upperBound);

        if (error) {
            throw new Error(`Failed to fetch events: ${error.message}`);
        }

        const rows = (data ?? []) as EventRow[];
        if (rows.length === 0) {
            break;
        }

        for (const row of rows) {
            stats.scanned++;

            const resolvedSourceUrl = resolveTechmemeUrl(row.source_url ?? '') ?? row.source_url;
            const resolvedRegistrationUrl = resolveTechmemeUrl(row.registration_url ?? '') ?? row.registration_url;

            const normalizedSource = resolvedSourceUrl ? normalizeUrlForCaching(resolvedSourceUrl) : null;
            const normalizedRegistration = resolvedRegistrationUrl
                ? normalizeUrlForCaching(resolvedRegistrationUrl)
                : null;
            const normalizedLocation = row.location ? normalizeLocationValue(row.location) : row.location;

            let organizerId = row.organizer_id;
            const sourceDomain = normalizedSource?.normalizedHost;
            const shouldInferOrganizer = !organizerId && Boolean(sourceDomain);

            if (APPLY && shouldInferOrganizer && sourceDomain) {
                organizerId = await OrganizerEnrichmentService.findOrCreateOrganizer(
                    {
                        name: humanizeOrganizerNameFromDomain(sourceDomain),
                        domain: sourceDomain,
                        websiteUrl: normalizedSource?.normalizedUrl ?? undefined,
                        sourceUrl: normalizedSource?.normalizedUrl ?? undefined,
                    },
                    supabase
                );
            }

            const nextProvenance = { ...(row.ingestion_provenance ?? {}) };
            if (normalizedSource) {
                nextProvenance.normalized_url = normalizedSource.normalizedUrl;
                nextProvenance.normalized_url_hash = normalizedSource.hash;
                nextProvenance.source_domain = normalizedSource.normalizedHost;
            }
            if (normalizedRegistration) {
                nextProvenance.registration_normalized_url = normalizedRegistration.normalizedUrl;
                nextProvenance.registration_normalized_url_hash = normalizedRegistration.hash;
            }

            const updateData: JsonRecord = {};
            if (normalizedSource && normalizedSource.normalizedUrl !== row.source_url) {
                updateData.source_url = normalizedSource.normalizedUrl;
            }
            if (
                normalizedRegistration &&
                normalizedRegistration.normalizedUrl !== row.registration_url
            ) {
                updateData.registration_url = normalizedRegistration.normalizedUrl;
            }
            if (normalizedLocation !== (row.location ?? '')) {
                updateData.location = normalizedLocation;
            }
            if (organizerId && organizerId !== row.organizer_id) {
                updateData.organizer_id = organizerId;
            }
            if (hasChanged(row.ingestion_provenance ?? {}, nextProvenance)) {
                updateData.ingestion_provenance = nextProvenance;
            }

            if (Object.keys(updateData).length === 0) {
                continue;
            }

            const changeSet = {
                url:
                    'source_url' in updateData ||
                    'registration_url' in updateData ||
                    'ingestion_provenance' in updateData,
                location: 'location' in updateData,
                organizer: 'organizer_id' in updateData,
            };

            stats.changed++;
            increment(stats, changeSet);

            if (!APPLY) {
                continue;
            }

            const { error: updateError } = await supabase
                .from('events')
                .update(updateData)
                .eq('id', row.id);

            if (updateError) {
                throw new Error(`Failed to update event ${row.id}: ${updateError.message}`);
            }
        }
    }

    return stats;
}

function printStats(label: string, stats: Stats): void {
    console.log(label);
    console.log(`  scanned: ${stats.scanned}`);
    console.log(`  changed: ${stats.changed}`);
    console.log(`  url fixes: ${stats.urlFixes}`);
    console.log(`  location fixes: ${stats.locationFixes}`);
    console.log(`  organizer fixes: ${stats.organizerFixes}`);
}

async function run(): Promise<void> {
    console.log(`Mode: ${APPLY ? 'apply' : 'dry-run'}`);
    console.log(`Limit: ${LIMIT ?? 'all rows'}`);
    console.log(`Batch size: ${BATCH_SIZE}`);

    const sourceEventStats = await processSourceEvents();
    const eventStats = await processEvents();

    printStats('\nsource_events', sourceEventStats);
    printStats('\nevents', eventStats);
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
