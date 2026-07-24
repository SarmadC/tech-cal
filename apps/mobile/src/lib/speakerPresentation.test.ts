import type { MobileSpeakerDetailEvent } from '@kurecal/domain';
import { describe, expect, it } from 'vitest';

import {
  buildSpeakerInitials,
  formatNetworkingStatus,
  formatSpeakerMetricDate,
  getNextSpeakerEvent,
  selectPrimarySpeakerEvent,
  selectSpeakerAvatarUrl,
  selectSpeakerPrimaryAction,
} from './speakerPresentation';

function event(
  id: string,
  startTime: string,
  isPastEvent: boolean
): MobileSpeakerDetailEvent {
  return {
    id,
    slug: id,
    title: id,
    startTime,
    location: null,
    format: null,
    imageUrl: null,
    organizerLogoUrl: null,
    isPastEvent,
  };
}

describe('speaker presentation', () => {
  it('keeps approved and legacy photos in the compact avatar path', () => {
    expect(
      selectSpeakerAvatarUrl({
        photoUrl: 'https://example.com/avatar-90.png',
        portraitUrl: 'https://example.com/portrait-1600.jpg',
      })
    ).toBe('https://example.com/portrait-1600.jpg');
    expect(
      selectSpeakerAvatarUrl({
        photoUrl: 'https://example.com/avatar-90.png',
        portraitUrl: null,
      })
    ).toBe('https://example.com/avatar-90.png');
  });

  it('selects the earliest upcoming event, then the most recent past event', () => {
    const events = [
      event('later', '2026-09-12T10:00:00.000Z', false),
      event('recent-past', '2026-06-20T10:00:00.000Z', true),
      event('next', '2026-08-01T10:00:00.000Z', false),
      event('older-past', '2025-06-20T10:00:00.000Z', true),
    ];

    expect(selectPrimarySpeakerEvent(events)?.id).toBe('next');
    expect(getNextSpeakerEvent(events)?.id).toBe('next');
    expect(
      selectPrimarySpeakerEvent(events.filter((item) => item.isPastEvent))?.id
    ).toBe('recent-past');
  });

  it('formats metrics and networking labels predictably', () => {
    expect(formatSpeakerMetricDate('2026-08-01T10:00:00.000Z', 'en-US')).toBe(
      'Aug 1'
    );
    expect(formatSpeakerMetricDate(null)).toBe('—');
    expect(formatNetworkingStatus('none')).toBe('Not contacted');
    expect(formatNetworkingStatus('requested')).toBe('Requested');
    expect(formatNetworkingStatus('connected')).toBe('Connected');
  });

  it('prefers LinkedIn, falls back to a website, and rejects unsafe links', () => {
    expect(
      selectSpeakerPrimaryAction({
        linkedinUrl: 'https://linkedin.com/in/dana',
        websiteUrl: 'https://dana.example',
      })
    ).toMatchObject({ kind: 'linkedin', label: 'View on LinkedIn' });
    expect(
      selectSpeakerPrimaryAction({
        linkedinUrl: null,
        websiteUrl: 'https://dana.example',
      })
    ).toMatchObject({ kind: 'website', label: 'Visit website' });
    expect(
      selectSpeakerPrimaryAction({
        linkedinUrl: 'javascript:alert(1)',
        websiteUrl: null,
      })
    ).toBeNull();
  });

  it('builds stable initials for image fallbacks', () => {
    expect(buildSpeakerInitials('Tony Kim')).toBe('TK');
    expect(buildSpeakerInitials('')).toBe('SP');
  });
});
