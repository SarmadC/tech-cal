/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach } from 'vitest';
import { DeterministicV2Strategy } from '../DeterministicV2Strategy';
import type { Event } from '@/types';
import type { CareerProfile } from '@/types/career';

describe('DeterministicV2Strategy - Networking Goal Boosts', () => {
  let strategy: DeterministicV2Strategy;

  beforeEach(() => {
    strategy = new DeterministicV2Strategy();
  });

  function buildEvent(partial: Partial<Event> = {}): Event {
    return {
      id: 'e1',
      title: 'Test',
      description: '',
      startTime: '2024-01-01T10:00:00Z',
      attendeeCount: 0,
      speakerLineup: [],
      category: { id: 't', name: 'Meetup', color: '#fff' },
      ...partial,
    } as Event;
  }

  function buildProfile(partial: Partial<CareerProfile> = {}): CareerProfile {
    return {
      networkingGoals: [],
      primarySkills: [],
      skillsToLearn: [],
      careerGoals: [],
      learningStyle: [],
      ...partial,
    } as CareerProfile;
  }

  it('is null-safe when speakerLineup is missing', () => {
    const event = buildEvent({ speakerLineup: undefined, category: { id: '1', name: 'Summit', color: '#fff' } });
    const profile = buildProfile({ networkingGoals: ['find-mentors'] });
    const res = (strategy as any).applyNetworkingGoalBoosts(event, profile) as number;
    expect(res).toBeGreaterThanOrEqual(8); // type boost applies
  });

  it('applies senior speaker bonus for find-mentors', () => {
    const event = buildEvent({
      category: { id: '1', name: 'Summit', color: '#fff' },
      speakerLineup: [{ title: 'Director of Engineering' } as any],
    });
    const profile = buildProfile({ networkingGoals: ['find-mentors'] });
    const res = (strategy as any).applyNetworkingGoalBoosts(event, profile) as number;
    expect(res).toBeGreaterThanOrEqual(20); // 12 senior + 8 type
  });

  it('applies attendee sweet spot for find-peers', () => {
    const event = buildEvent({ category: { id: '1', name: 'Networking', color: '#fff' }, attendeeCount: 120 });
    const profile = buildProfile({ networkingGoals: ['find-peers'] });
    const res = (strategy as any).applyNetworkingGoalBoosts(event, profile) as number;
    expect(res).toBeGreaterThanOrEqual(22); // 12 type + 10 attendees
  });

  it('applies collaborators signals', () => {
    const event = buildEvent({ category: { id: '1', name: 'Hackathon', color: '#fff' }, description: 'team collaborate' });
    const profile = buildProfile({ networkingGoals: ['find-collaborators'] });
    const res = (strategy as any).applyNetworkingGoalBoosts(event, profile) as number;
    expect(res).toBeGreaterThanOrEqual(21); // 15 type + 6 keywords
  });

  it('applies employers signals', () => {
    const event = buildEvent({ category: { id: '1', name: 'Career Fair', color: '#fff' }, description: 'hiring now' });
    const profile = buildProfile({ networkingGoals: ['find-employers'] });
    const res = (strategy as any).applyNetworkingGoalBoosts(event, profile) as number;
    expect(res).toBeGreaterThanOrEqual(24); // 16 type + 8 keyword
  });

  it('combines boosts across multiple goals and respects 100 cap', () => {
    const event = buildEvent({
      category: { id: '1', name: 'Conference', color: '#fff' },
      attendeeCount: 180,
      description: 'call for speakers – collaborate with team – hiring now',
      speakerLineup: [{ title: 'VP, Engineering' } as any],
    });
    const profile = buildProfile({ networkingGoals: ['find-mentors', 'find-peers', 'industry-insights', 'thought-leadership'] });
    const boost = (strategy as any).applyNetworkingGoalBoosts(event, profile) as number;
    expect(boost).toBeGreaterThan(0);

    const result = (strategy as any).calculateNetworkingValueScore(event, profile);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});


describe('DeterministicV2Strategy - Networking thresholds sanity checks', () => {
  let strategy: DeterministicV2Strategy;

  beforeEach(() => {
    strategy = new DeterministicV2Strategy();
  });

  function buildEvent(partial: Partial<Event> = {}): Event {
    return {
      id: 'e-th',
      title: 'Networking Thresholds',
      description: '',
      startTime: '2024-01-01T10:00:00Z',
      attendeeCount: 0,
      speakerLineup: [],
      category: { id: 't', name: 'Conference', color: '#fff' },
      ...partial,
    } as Event;
  }

  it('base score for conference >= 90 even with 0 attendees', () => {
    const event = buildEvent({ attendeeCount: 0 });
    const score = (strategy as any).analyzeNetworkingOpportunities(event) as number;
    expect(score).toBeGreaterThanOrEqual(90);
  });

  it('boundary: 49 vs 50 attendees (conference)', () => {
    const e49 = buildEvent({ attendeeCount: 49 });
    const e50 = buildEvent({ attendeeCount: 50 });
    const s49 = (strategy as any).analyzeNetworkingOpportunities(e49) as number; // +10
    const s50 = (strategy as any).analyzeNetworkingOpportunities(e50) as number; // +15
    expect(s50).toBeGreaterThanOrEqual(s49);
    expect(s49).toBeLessThanOrEqual(100);
    expect(s50).toBeLessThanOrEqual(100);
  });

  it('boundary: 200 vs 201 attendees (conference)', () => {
    const e200 = buildEvent({ attendeeCount: 200 });
    const e201 = buildEvent({ attendeeCount: 201 });
    const s200 = (strategy as any).analyzeNetworkingOpportunities(e200) as number; // +15
    const s201 = (strategy as any).analyzeNetworkingOpportunities(e201) as number; // +5
    expect(s200).toBeGreaterThan(s201);
  });

  it('boundary: 500 vs 501 attendees (conference)', () => {
    const e500 = buildEvent({ attendeeCount: 500 });
    const e501 = buildEvent({ attendeeCount: 501 });
    const s500 = (strategy as any).analyzeNetworkingOpportunities(e500) as number; // +5
    const s501 = (strategy as any).analyzeNetworkingOpportunities(e501) as number; // -10
    expect(s500).toBeGreaterThan(s501);
  });

  it('webinar base should not exceed initial 40 baseline', () => {
    const webinar = buildEvent({ category: { id: 'w', name: 'Webinar', color: '#fff' }, attendeeCount: 0 });
    const s0 = (strategy as any).analyzeNetworkingOpportunities(webinar) as number; // baseline 40
    expect(s0).toBeGreaterThanOrEqual(40);
    expect(s0).toBeLessThan(60);
  });

  it('webinar with 50 attendees gets small boost over baseline', () => {
    const webinar = buildEvent({ category: { id: 'w', name: 'Webinar', color: '#fff' }, attendeeCount: 50 });
    const s50 = (strategy as any).analyzeNetworkingOpportunities(webinar) as number; // 40 + 15 = 55
    expect(s50).toBeGreaterThan(40);
    expect(s50).toBeLessThanOrEqual(60);
  });
});


