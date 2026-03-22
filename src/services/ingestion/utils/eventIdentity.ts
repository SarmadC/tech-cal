import crypto from 'crypto';

import { normalizeUrlForCaching } from './urlCanonicalizer';

export const EVENT_IDENTITY_KEY_TYPES = [
    'source_url',
    'registration_url',
    'external_id',
] as const;

export type EventIdentityKeyType = (typeof EVENT_IDENTITY_KEY_TYPES)[number];

export interface EventIdentityKey {
    keyType: EventIdentityKeyType;
    keyHash: string;
    eventYear: number;
    rawValue: string;
}

export function getEventIdentityYear(startTime: string | null | undefined): number | null {
    if (!startTime) {
        return null;
    }

    const parsed = new Date(startTime);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return parsed.getUTCFullYear();
}

export function hashEventIdentityValue(value: string): string {
    return crypto.createHash('md5').update(value).digest('hex');
}

export function normalizeEventIdentityUrl(url: string | null | undefined): string | null {
    if (!url?.trim()) {
        return null;
    }

    const normalized = normalizeUrlForCaching(url);
    return normalized?.normalizedUrl ?? null;
}

export function buildEventIdentityKeys(input: {
    startTime: string | null | undefined;
    sourceUrl?: string | null;
    registrationUrl?: string | null;
    externalId?: string | null;
}): EventIdentityKey[] {
    const eventYear = getEventIdentityYear(input.startTime);
    if (eventYear === null) {
        return [];
    }

    const keys: EventIdentityKey[] = [];

    const sourceUrl = normalizeEventIdentityUrl(input.sourceUrl);
    if (sourceUrl) {
        keys.push({
            keyType: 'source_url',
            keyHash: hashEventIdentityValue(sourceUrl),
            eventYear,
            rawValue: sourceUrl,
        });
    }

    const registrationUrl = normalizeEventIdentityUrl(input.registrationUrl);
    if (registrationUrl) {
        keys.push({
            keyType: 'registration_url',
            keyHash: hashEventIdentityValue(registrationUrl),
            eventYear,
            rawValue: registrationUrl,
        });
    }

    const externalId = input.externalId?.trim() || null;
    if (externalId) {
        keys.push({
            keyType: 'external_id',
            keyHash: hashEventIdentityValue(externalId),
            eventYear,
            rawValue: externalId,
        });
    }

    return keys;
}
