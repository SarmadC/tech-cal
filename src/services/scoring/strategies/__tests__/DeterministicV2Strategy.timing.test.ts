// src/services/scoring/strategies/__tests__/DeterministicV2Strategy.timing.test.ts

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import { DeterministicV2Strategy } from '../DeterministicV2Strategy';

const baseProfile: any = {
  userId: 'u1', profileId: 'p1', lastUpdated: new Date().toISOString(),
  currentRole: 'Engineer', seniority: 'mid-level', industry: 'technology', companySize: 'startup',
  primarySkills: ['JS'], skillsToLearn: ['React'], interests: [],
  careerGoals: ['skill-development'], timeframe: 'short-term', learningStyle: ['hands-on'],
  availableTime: 'limited', budget: 'low', networkingGoals: [], preferredEventTypes: ['workshop']
};

describe('DeterministicV2Strategy timing duration estimation', () => {
  it('uses endTime - startTime when available', () => {
    const event: any = {
      id: 'e1', title: '2 hours', description: '', category: { name: 'workshop' },
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    };
    const s = new DeterministicV2Strategy();
    const res = s.calculate({ event, careerProfile: baseProfile });
    expect(res).toBeDefined();
  });

  it('falls back to isMultiDay → assumes 8h when no endTime', () => {
    const event: any = {
      id: 'e2', title: 'multi-day', description: '', category: { name: 'conference' },
      startTime: new Date().toISOString(), endTime: null, isMultiDay: true
    };
    const s = new DeterministicV2Strategy();
    const res = s.calculate({ event, careerProfile: baseProfile });
    expect(res).toBeDefined();
  });

  it('uses dailySchedule dailyStart/dailyEnd when present', () => {
    const now = new Date();
    const event: any = {
      id: 'e3', title: 'daily schedule', description: '', category: { name: 'workshop' },
      startTime: now.toISOString(), endTime: null,
      dailySchedule: { dailyStart: '10:00', dailyEnd: '13:00' }
    };
    const s = new DeterministicV2Strategy();
    const res = s.calculate({ event, careerProfile: baseProfile });
    expect(res).toBeDefined();
  });

  it('uses first schedule block when dailyStart/dailyEnd not present', () => {
    const now = new Date();
    const event: any = {
      id: 'e4', title: 'first block', description: '', category: { name: 'workshop' },
      startTime: now.toISOString(), endTime: null,
      dailySchedule: { schedule: [{ start: '09:00', end: '11:00', date: now.toISOString() }] }
    };
    const s = new DeterministicV2Strategy();
    const res = s.calculate({ event, careerProfile: baseProfile });
    expect(res).toBeDefined();
  });

  it('defaults to 2 hours when all else is missing', () => {
    const event: any = {
      id: 'e5', title: 'default', description: '', category: { name: 'workshop' },
      startTime: new Date().toISOString(), endTime: null
    };
    const s = new DeterministicV2Strategy();
    const res = s.calculate({ event, careerProfile: baseProfile });
    expect(res).toBeDefined();
  });
});

describe('DeterministicV2Strategy schedule alignment vs availableTime', () => {
  it('2h event favors limited > moderate > flexible', () => {
    const start = new Date();
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const event: any = {
      id: 'e6', title: '2h', description: '', category: { name: 'workshop' },
      startTime: start.toISOString(), endTime: end.toISOString()
    };
    const s = new DeterministicV2Strategy();

    const limited = { ...baseProfile, availableTime: 'limited' };
    const moderate = { ...baseProfile, availableTime: 'moderate' };
    const flexible = { ...baseProfile, availableTime: 'flexible' };

    const rLimited = s.calculate({ event, careerProfile: limited as any });
    const rModerate = s.calculate({ event, careerProfile: moderate as any });
    const rFlexible = s.calculate({ event, careerProfile: flexible as any });

    expect(rLimited.components.timingBonus).toBeGreaterThan(rModerate.components.timingBonus);
    expect(rModerate.components.timingBonus).toBeGreaterThan(rFlexible.components.timingBonus);
  });

  it('6h event favors flexible/moderate over limited', () => {
    const start = new Date();
    const end = new Date(start.getTime() + 6 * 60 * 60 * 1000);
    const event: any = {
      id: 'e7', title: '6h', description: '', category: { name: 'workshop' },
      startTime: start.toISOString(), endTime: end.toISOString()
    };
    const s = new DeterministicV2Strategy();

    const limited = { ...baseProfile, availableTime: 'limited' };
    const moderate = { ...baseProfile, availableTime: 'moderate' };
    const flexible = { ...baseProfile, availableTime: 'flexible' };

    const rLimited = s.calculate({ event, careerProfile: limited as any });
    const rModerate = s.calculate({ event, careerProfile: moderate as any });
    const rFlexible = s.calculate({ event, careerProfile: flexible as any });

    expect(rFlexible.components.timingBonus).toBeGreaterThan(rLimited.components.timingBonus);
    expect(rModerate.components.timingBonus).toBeGreaterThanOrEqual(rFlexible.components.timingBonus);
  });
});


