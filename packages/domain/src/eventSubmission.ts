import { z } from 'zod';

export const EVENT_SUBMISSION_TYPE_OPTIONS = [
  { value: 'tech_event', label: 'Tech Event' },
  { value: 'hackathon', label: 'Hackathon' },
  { value: 'meetup', label: 'Meetup' },
  { value: 'conference', label: 'Conference' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'other', label: 'Other' },
] as const;

const EVENT_SUBMISSION_TYPE_VALUES = [
  'tech_event',
  'hackathon',
  'meetup',
  'conference',
  'workshop',
  'other',
] as const;

export const eventSubmissionTypeSchema = z.enum(EVENT_SUBMISSION_TYPE_VALUES);

export type EventSubmissionType = z.infer<typeof eventSubmissionTypeSchema>;

export const eventSubmissionRequestSchema = z.object({
  title: z.string(),
  description: z.string().nullable().optional(),
  event_type: eventSubmissionTypeSchema.nullable().optional(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable().optional(),
  is_virtual: z.boolean().optional(),
  location: z.string().nullable().optional(),
  registration_url: z.string().nullable().optional(),
  organizer_name: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

export type EventSubmissionRequest = z.infer<typeof eventSubmissionRequestSchema>;

export const normalizedEventSubmissionRequestSchema = z.object({
  title: z.string(),
  description: z.string().nullable(),
  event_type: eventSubmissionTypeSchema,
  start_date: z.string(),
  end_date: z.string().nullable(),
  is_virtual: z.boolean(),
  location: z.string().nullable(),
  registration_url: z.string().nullable(),
  organizer_name: z.string().nullable(),
  tags: z.array(z.string()),
});

export type NormalizedEventSubmissionRequest = z.infer<
  typeof normalizedEventSubmissionRequestSchema
>;

const ALLOWED_EVENT_TYPES = new Set<EventSubmissionType>(EVENT_SUBMISSION_TYPE_VALUES);

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function normalizeDateTime(
  value: unknown,
  fieldName: 'start_date' | 'end_date'
): { value: string | null; error: string | null } {
  const normalized = normalizeOptionalString(value);

  if (!normalized) {
    return {
      value: null,
      error: fieldName === 'start_date' ? 'Start date is required' : null,
    };
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return {
      value: null,
      error: `${
        fieldName === 'start_date' ? 'Start date' : 'End date'
      } must be a valid datetime`,
    };
  }

  return { value: parsed.toISOString(), error: null };
}

export function normalizeEventSubmissionRequest(
  payload: Record<string, unknown>
): { data: NormalizedEventSubmissionRequest | null; error: string | null } {
  const normalizedTitle = normalizeOptionalString(payload.title);
  if (!normalizedTitle) {
    return { data: null, error: 'Title is required' };
  }

  const rawEventType =
    typeof payload.event_type === 'string' ? payload.event_type.trim() : 'other';
  if (!ALLOWED_EVENT_TYPES.has(rawEventType as EventSubmissionType)) {
    return { data: null, error: 'Event type is invalid' };
  }

  const normalizedStartDate = normalizeDateTime(payload.start_date, 'start_date');
  if (normalizedStartDate.error) {
    return { data: null, error: normalizedStartDate.error };
  }

  const normalizedEndDate = normalizeDateTime(payload.end_date, 'end_date');
  if (normalizedEndDate.error) {
    return { data: null, error: normalizedEndDate.error };
  }

  const isVirtual = payload.is_virtual === true;
  const location = normalizeOptionalString(payload.location);
  if (!isVirtual && !location) {
    return { data: null, error: 'Location is required for in-person events' };
  }

  const tags = Array.isArray(payload.tags)
    ? Array.from(
        new Set(
          payload.tags
            .filter((tag): tag is string => typeof tag === 'string')
            .map((tag) => tag.trim())
            .filter(Boolean)
        )
      )
    : [];

  return {
    data: {
      title: normalizedTitle,
      description: normalizeOptionalString(payload.description),
      event_type: rawEventType as EventSubmissionType,
      start_date: normalizedStartDate.value!,
      end_date: normalizedEndDate.value,
      is_virtual: isVirtual,
      location: isVirtual ? null : location,
      registration_url: normalizeOptionalString(payload.registration_url),
      organizer_name: normalizeOptionalString(payload.organizer_name),
      tags,
    },
    error: null,
  };
}
