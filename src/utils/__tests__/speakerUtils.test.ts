import { describe, it, expect } from 'vitest';
import { hasSeniorSpeaker } from '../speakerUtils';

describe('speakerUtils.hasSeniorSpeaker', () => {
  it('returns false for undefined or empty arrays', () => {
    expect(hasSeniorSpeaker(undefined)).toBe(false);
    expect(hasSeniorSpeaker([])).toBe(false);
  });

  it('detects common senior titles', () => {
    expect(hasSeniorSpeaker([{ title: 'Director of Engineering' }])).toBe(true);
    expect(hasSeniorSpeaker([{ title: 'VP, Product' }])).toBe(true);
    expect(hasSeniorSpeaker([{ title: 'CTO' }])).toBe(true);
    expect(hasSeniorSpeaker([{ title: 'Chief Information Officer' }])).toBe(true);
    expect(hasSeniorSpeaker([{ title: 'Head of AI' }])).toBe(true);
    expect(hasSeniorSpeaker([{ title: 'Principal Engineer' }])).toBe(true);
    expect(hasSeniorSpeaker([{ title: 'Distinguished Fellow' }])).toBe(true);
  });

  it('is case-insensitive and tolerant to formatting', () => {
    expect(hasSeniorSpeaker([{ title: 'cTo' }])).toBe(true);
    expect(hasSeniorSpeaker([{ title: ' vice president ' }])).toBe(true);
  });

  it('returns false for non-senior titles', () => {
    expect(hasSeniorSpeaker([{ title: 'Software Engineer' }])).toBe(false);
    expect(hasSeniorSpeaker([{ title: 'Developer' }])).toBe(false);
    expect(hasSeniorSpeaker([{ title: '' }])).toBe(false);
  });
});


