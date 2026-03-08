import type { EventSourceRecord } from '@/types/ingestion';
import {
    humanizeOrganizerNameFromDomain,
    isPlaceholderOrganizerName,
    normalizeHostname,
    normalizeLocationValue,
} from '@/utils/ingestion/sourceCleanup';
import { applyUrlCanonicalization } from './urlCanonicalizer';

function shouldReplaceOrganizerDomain(
    currentDomain: string | undefined
): boolean {
    if (!currentDomain) {
        return true;
    }

    return normalizeHostname(currentDomain) === 'techmeme.com';
}

export function applyIngestionRecordCleanup(record: EventSourceRecord): void {
    applyUrlCanonicalization(record);

    record.location = normalizeLocationValue(record.location);

    if (record.sourceDomain && shouldReplaceOrganizerDomain(record.organizerDomain)) {
        record.organizerDomain = record.sourceDomain;
    }

    if (record.organizer) {
        const trimmedOrganizer = record.organizer.trim();
        record.organizer = trimmedOrganizer || undefined;
    }

    if (isPlaceholderOrganizerName(record.organizer)) {
        record.organizer = record.sourceDomain
            ? humanizeOrganizerNameFromDomain(record.sourceDomain)
            : undefined;
    }
}
