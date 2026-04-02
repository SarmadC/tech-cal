export const EVENT_SUBMISSION_TYPE_OPTIONS = [
  { value: 'tech_event', label: 'Tech Event' },
  { value: 'hackathon', label: 'Hackathon' },
  { value: 'meetup', label: 'Meetup' },
  { value: 'conference', label: 'Conference' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'other', label: 'Other' },
] as const;

export type EventSubmissionType = typeof EVENT_SUBMISSION_TYPE_OPTIONS[number]['value'];

export interface SubmitEventFormState {
  title: string;
  description: string;
  eventType: EventSubmissionType;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  isVirtual: boolean;
  location: string;
  registrationUrl: string;
  organizerName: string;
  tagsInput: string;
}

export interface SubmitEventRequestPayload {
  description?: string | null;
  end_date?: string | null;
  event_type: EventSubmissionType;
  is_virtual: boolean;
  location?: string | null;
  organizer_name?: string | null;
  registration_url?: string | null;
  start_date: string | null;
  tags: string[];
  title: string;
}

export interface SubmitEventValidationErrors {
  location?: string;
  startDate?: string;
  title?: string;
}

function getApiBaseUrl() {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!apiUrl) {
    throw new Error('EXPO_PUBLIC_API_URL is missing from the mobile environment.');
  }

  return apiUrl.replace(/\/$/, '');
}

export function createInitialSubmitEventState(): SubmitEventFormState {
  return {
    title: '',
    description: '',
    eventType: 'tech_event',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    isVirtual: false,
    location: '',
    registrationUrl: '',
    organizerName: '',
    tagsInput: '',
  };
}

export function combineDateTime(date: string, time: string): string | null {
  if (!date.trim()) {
    return null;
  }

  if (!time.trim()) {
    return `${date}T00:00:00`;
  }

  return `${date}T${time}:00`;
}

function normalizeTags(tagsInput: string): string[] {
  return Array.from(
    new Set(
      tagsInput
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  );
}

export function buildSubmitEventPayload(form: SubmitEventFormState): SubmitEventRequestPayload {
  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    event_type: form.eventType,
    start_date: combineDateTime(form.startDate, form.startTime),
    end_date: combineDateTime(form.endDate, form.endTime),
    is_virtual: form.isVirtual,
    location: form.isVirtual ? null : form.location.trim() || null,
    registration_url: form.registrationUrl.trim() || null,
    organizer_name: form.organizerName.trim() || null,
    tags: normalizeTags(form.tagsInput),
  };
}

export function validateSubmitEventForm(form: SubmitEventFormState): SubmitEventValidationErrors {
  const errors: SubmitEventValidationErrors = {};

  if (!form.title.trim()) {
    errors.title = 'Title is required';
  }

  if (!form.startDate.trim()) {
    errors.startDate = 'Start date is required';
  }

  if (!form.isVirtual && !form.location.trim()) {
    errors.location = 'Location is required for in-person events';
  }

  return errors;
}

export async function submitEventSubmission(
  accessToken: string,
  payload: SubmitEventRequestPayload
): Promise<string> {
  if (!accessToken.trim()) {
    throw new Error('Sign in required');
  }

  const response = await fetch(`${getApiBaseUrl()}/api/events/submit`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => ({}))) as { error?: string; id?: string };
  if (!response.ok || !data.id) {
    throw new Error(data.error || 'Submission failed');
  }

  return data.id;
}
