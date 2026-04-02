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

export type UserSubmittedEventInsert = Database['public']['Tables']['user_submitted_events']['Insert'];

export function toUserSubmittedEventInsert(
    userId: string,
    normalized: NormalizedEventSubmissionRequest
): UserSubmittedEventInsert {
    return {
        user_id: userId,
        title: normalized.title,
        description: normalized.description,
        event_type: normalized.event_type,
        start_date: normalized.start_date,
        end_date: normalized.end_date,
        location: normalized.location,
        is_virtual: normalized.is_virtual,
        registration_url: normalized.registration_url,
        organizer_name: normalized.organizer_name,
        tags: normalized.tags,
    };
}
