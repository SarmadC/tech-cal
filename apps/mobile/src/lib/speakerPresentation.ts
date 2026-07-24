import type { MobileSpeakerDetail, MobileSpeakerDetailEvent } from '@kurecal/domain';

type SpeakerImageInput = Pick<
  MobileSpeakerDetail,
  'photoUrl' | 'portraitUrl'
> | null;

type SpeakerActionInput = Pick<
  MobileSpeakerDetail,
  'linkedinUrl' | 'websiteUrl'
>;

export type SpeakerPrimaryAction = {
  kind: 'linkedin' | 'website';
  label: 'View on LinkedIn' | 'Visit website';
  url: string;
};

function getSafeHttpUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}

export function buildSpeakerInitials(name: string | null | undefined): string {
  const parts = (name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return 'SP';
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
}

/**
 * Speaker photography is always presented at avatar scale. Approved portraits
 * win, while the legacy photo remains a compatible compact fallback.
 */
export function selectSpeakerAvatarUrl(
  speaker: SpeakerImageInput
): string | null {
  return speaker?.portraitUrl?.trim() || speaker?.photoUrl?.trim() || null;
}

export function selectPrimarySpeakerEvent(
  events: MobileSpeakerDetailEvent[]
): MobileSpeakerDetailEvent | null {
  const validEvents = events.filter((event) =>
    Number.isFinite(new Date(event.startTime).getTime())
  );
  const upcoming = validEvents
    .filter((event) => !event.isPastEvent)
    .sort(
      (left, right) =>
        new Date(left.startTime).getTime() - new Date(right.startTime).getTime()
    );

  if (upcoming[0]) {
    return upcoming[0];
  }

  return (
    validEvents
      .filter((event) => event.isPastEvent)
      .sort(
        (left, right) =>
          new Date(right.startTime).getTime() -
          new Date(left.startTime).getTime()
      )[0] ?? null
  );
}

export function getNextSpeakerEvent(
  events: MobileSpeakerDetailEvent[]
): MobileSpeakerDetailEvent | null {
  return (
    events
      .filter(
        (event) =>
          !event.isPastEvent &&
          Number.isFinite(new Date(event.startTime).getTime())
      )
      .sort(
        (left, right) =>
          new Date(left.startTime).getTime() -
          new Date(right.startTime).getTime()
      )[0] ?? null
  );
}

export function formatSpeakerMetricDate(
  value: string | null | undefined,
  locale = 'en-US'
): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatNetworkingStatus(
  status: NonNullable<MobileSpeakerDetail['networkingState']>['status']
): 'Not contacted' | 'Requested' | 'Connected' {
  if (status === 'connected') {
    return 'Connected';
  }

  return status === 'requested' ? 'Requested' : 'Not contacted';
}

export function selectSpeakerPrimaryAction(
  speaker: SpeakerActionInput
): SpeakerPrimaryAction | null {
  const linkedinUrl = getSafeHttpUrl(speaker.linkedinUrl);
  if (linkedinUrl) {
    return {
      kind: 'linkedin',
      label: 'View on LinkedIn',
      url: linkedinUrl,
    };
  }

  const websiteUrl = getSafeHttpUrl(speaker.websiteUrl);
  return websiteUrl
    ? {
        kind: 'website',
        label: 'Visit website',
        url: websiteUrl,
      }
    : null;
}
