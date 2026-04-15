import {
    EVENT_SUBMISSION_TYPE_OPTIONS,
    normalizeEventSubmissionRequest,
    type EventSubmissionRequest,
    type EventSubmissionType,
    type NormalizedEventSubmissionRequest,
} from '@kurecal/domain';

import type { Database } from '@/types/supabase';

export {
    EVENT_SUBMISSION_TYPE_OPTIONS,
    normalizeEventSubmissionRequest,
};
export type {
    EventSubmissionRequest,
    EventSubmissionType,
    NormalizedEventSubmissionRequest,
};

export type EventSubmissionRiskFlag =
    | 'possible_duplicate_event'
    | 'repeat_submission'
    | 'unsafe_submitted_url';

export type UserSubmittedEventInsert = Database['public']['Tables']['user_submitted_events']['Insert'];

const EVENT_SUBMISSION_SCHEMA_VERSION = 1;

export function deriveEventSubmissionRegistrationMode(
    normalized: NormalizedEventSubmissionRequest
): 'external' | 'native' {
    return normalized.registration_url ? 'external' : 'native';
}

export function assessEventSubmissionRisk(input: {
    duplicateEventCount: number;
    repeatedSubmissionCount: number;
    unsafeSubmittedUrl?: boolean;
}) {
    const flags: EventSubmissionRiskFlag[] = [];
    const warnings: string[] = [];

    if (input.repeatedSubmissionCount > 0) {
        flags.push('repeat_submission');
        warnings.push('Similar submission fingerprint has already been seen.');
    }

    if (input.duplicateEventCount > 0) {
        flags.push('possible_duplicate_event');
        warnings.push('Possible duplicate event exists in the public events table.');
    }

    if (input.unsafeSubmittedUrl) {
        flags.push('unsafe_submitted_url');
        warnings.push('Submission contains a URL that is not safe to fetch server-side.');
    }

    return {
        flags,
        validationSummary: {
            duplicate_event_count: input.duplicateEventCount,
            normalized_at: new Date().toISOString(),
            repeated_submission_count: input.repeatedSubmissionCount,
            schema_version: EVENT_SUBMISSION_SCHEMA_VERSION,
            warnings,
        },
    };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function appendEventSubmissionRiskFlag(
    existingFlags: unknown,
    nextFlag: EventSubmissionRiskFlag
): EventSubmissionRiskFlag[] {
    const normalizedFlags = Array.isArray(existingFlags)
        ? existingFlags.filter(
              (flag): flag is EventSubmissionRiskFlag =>
                  flag === 'possible_duplicate_event' ||
                  flag === 'repeat_submission' ||
                  flag === 'unsafe_submitted_url'
          )
        : [];

    return normalizedFlags.includes(nextFlag)
        ? normalizedFlags
        : [...normalizedFlags, nextFlag];
}

export function mergeEventSubmissionValidationSummary(
    existingSummary: unknown,
    warning: string,
    extraFields?: Record<string, unknown>
) {
    const existingWarnings =
        isPlainObject(existingSummary) && Array.isArray(existingSummary.warnings)
            ? existingSummary.warnings.filter(
                  (value): value is string => typeof value === 'string'
              )
            : [];

    return {
        ...(isPlainObject(existingSummary) ? existingSummary : {}),
        ...(extraFields ?? {}),
        normalized_at: new Date().toISOString(),
        schema_version: EVENT_SUBMISSION_SCHEMA_VERSION,
        warnings: [...new Set([...existingWarnings, warning])],
    };
}

export function toUserSubmittedEventInsert(
    userId: string,
    normalized: NormalizedEventSubmissionRequest,
    options: {
        duplicateEventCount?: number;
        repeatedSubmissionCount?: number;
        submissionFingerprint?: string;
        unsafeSubmittedUrl?: boolean;
    } = {}
): UserSubmittedEventInsert {
    const risk = assessEventSubmissionRisk({
        duplicateEventCount: options.duplicateEventCount ?? 0,
        repeatedSubmissionCount: options.repeatedSubmissionCount ?? 0,
        unsafeSubmittedUrl: options.unsafeSubmittedUrl,
    });

    return {
        description: normalized.description,
        end_date: normalized.end_date,
        event_type: normalized.event_type,
        is_virtual: normalized.is_virtual,
        location: normalized.location,
        organizer_name: normalized.organizer_name,
        registration_mode: deriveEventSubmissionRegistrationMode(normalized),
        registration_url: normalized.registration_url,
        risk_flags: risk.flags,
        start_date: normalized.start_date,
        submission_fingerprint: options.submissionFingerprint ?? null,
        submitted_payload: normalized,
        tags: normalized.tags,
        title: normalized.title,
        user_id: userId,
        validation_summary: risk.validationSummary,
    };
}
