import { describe, it, expect } from 'vitest';
import type { Event } from '@/types';
import type { CareerProfile } from '@/types/career';
import type { UserLocation } from '@/services/locationScoringService';
import {
  buildCareerProfileFingerprint,
  buildLocationFingerprint,
  buildEventFingerprint,
} from '../recommendationFingerprint';

const baseProfile: CareerProfile = {
  userId: 'u1',
  profileId: 'p1',
  lastUpdated: new Date().toISOString(),
  primarySkills: ['typescript', 'react'],
  skillsToLearn: ['rust'],
  interests: ['backend'],
  careerGoals: ['skill-development'],
  industry: 'technology',
  learningStyle: ['hands-on'],
  timeframe: 'medium-term',
  budget: 'moderate',
  networkingGoals: ['find-peers'],
  preferredEventTypes: ['workshop'],
  currentRole: 'engineer',
  companySize: 'medium',
  seniority: 'mid-level',
  availableTime: 'moderate',
};

describe('buildCareerProfileFingerprint', () => {
  it('returns "cold-start" for null profile', () => {
    expect(buildCareerProfileFingerprint(null)).toBe('cold-start');
  });

  it('returns a deterministic hex string for a given profile', () => {
    const fp1 = buildCareerProfileFingerprint(baseProfile);
    const fp2 = buildCareerProfileFingerprint(baseProfile);
    expect(fp1).toBe(fp2);
    expect(fp1).toHaveLength(16);
    expect(fp1).toMatch(/^[0-9a-f]{16}$/);
  });

  it('changes when profile fields change', () => {
    const modified = { ...baseProfile, currentRole: 'manager' };
    const fp1 = buildCareerProfileFingerprint(baseProfile);
    const fp2 = buildCareerProfileFingerprint(modified);
    expect(fp1).not.toBe(fp2);
  });

  it('changes when skills change', () => {
    const modified = { ...baseProfile, primarySkills: ['python', 'react'] };
    const fp1 = buildCareerProfileFingerprint(baseProfile);
    const fp2 = buildCareerProfileFingerprint(modified);
    expect(fp1).not.toBe(fp2);
  });

  it('handles empty/missing arrays gracefully', () => {
    const sparse: CareerProfile = {
      ...baseProfile,
      primarySkills: [],
      skillsToLearn: [],
      interests: [],
      careerGoals: [],
      learningStyle: [],
      networkingGoals: [],
      preferredEventTypes: [],
    };
    const fp = buildCareerProfileFingerprint(sparse);
    expect(fp).toHaveLength(16);
    expect(fp).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe('buildLocationFingerprint', () => {
  it('returns "none" for null/undefined location', () => {
    expect(buildLocationFingerprint(null)).toBe('none');
    expect(buildLocationFingerprint(undefined)).toBe('none');
  });

  it('returns a deterministic hex string', () => {
    const loc: UserLocation = { city: 'London', country: 'UK', timezone: 'Europe/London' };
    const fp1 = buildLocationFingerprint(loc);
    const fp2 = buildLocationFingerprint(loc);
    expect(fp1).toBe(fp2);
    expect(fp1).toHaveLength(12);
    expect(fp1).toMatch(/^[0-9a-f]{12}$/);
  });

  it('normalizes case and whitespace', () => {
    const loc1: UserLocation = { city: 'London', country: 'UK' };
    const loc2: UserLocation = { city: '  london  ', country: '  uk  ' };
    expect(buildLocationFingerprint(loc1)).toBe(buildLocationFingerprint(loc2));
  });

  it('changes when location changes', () => {
    const london: UserLocation = { city: 'London', country: 'UK' };
    const paris: UserLocation = { city: 'Paris', country: 'France' };
    expect(buildLocationFingerprint(london)).not.toBe(buildLocationFingerprint(paris));
  });

  it('handles missing optional fields', () => {
    const loc: UserLocation = { city: 'Berlin' };
    const fp = buildLocationFingerprint(loc);
    expect(fp).toHaveLength(12);
  });
});

describe('buildEventFingerprint', () => {
  const baseEvent: Event = {
    id: 'evt-1',
    createdAt: '2026-01-01T00:00:00Z',
    title: 'Test Event',
    description: 'Desc',
    organizer: 'Org',
    location: 'Online',
    status: 'confirmed',
    startTime: '2026-06-01T09:00:00Z',
    endTime: '2026-06-01T17:00:00Z',
    sourceUrl: 'https://example.com',
    livestreamUrl: null,
    eventTypeId: 'type-1',
  };

  it('returns a deterministic hex string', () => {
    const fp1 = buildEventFingerprint(baseEvent);
    const fp2 = buildEventFingerprint(baseEvent);
    expect(fp1).toBe(fp2);
    expect(fp1).toHaveLength(12);
    expect(fp1).toMatch(/^[0-9a-f]{12}$/);
  });

  it('changes when event id changes', () => {
    const other = { ...baseEvent, id: 'evt-2' };
    expect(buildEventFingerprint(baseEvent)).not.toBe(buildEventFingerprint(other));
  });

  it('changes when title changes', () => {
    const other = { ...baseEvent, title: 'Different Title' };
    expect(buildEventFingerprint(baseEvent)).not.toBe(buildEventFingerprint(other));
  });

  it('is stable regardless of extra event properties', () => {
    const extended = { ...baseEvent, description: 'Changed description', organizer: 'New Org' };
    // fingerprint only uses id, title, startTime, endTime, eventTypeId
    expect(buildEventFingerprint(baseEvent)).toBe(buildEventFingerprint(extended));
  });
});
