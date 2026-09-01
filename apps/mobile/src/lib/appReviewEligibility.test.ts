import { describe, expect, it } from 'vitest';

import { isAppReviewEligible } from './appReviewEligibility';

const NOW = new Date('2026-08-14T12:00:00.000Z').getTime();

describe('App Store review eligibility', () => {
  it('requires an account age of at least seven days', () => {
    expect(
      isAppReviewEligible({
        accountCreatedAt: '2026-08-08T12:00:01.000Z',
        eventSaveCount: 3,
        interaction: 'event-save',
        now: NOW,
      }),
    ).toBe(false);
    expect(
      isAppReviewEligible({
        accountCreatedAt: 'not-a-date',
        eventSaveCount: 3,
        interaction: 'event-save',
        now: NOW,
      }),
    ).toBe(false);
  });

  it('qualifies the third event save but not an earlier save', () => {
    const accountCreatedAt = '2026-08-01T12:00:00.000Z';
    expect(
      isAppReviewEligible({
        accountCreatedAt,
        eventSaveCount: 2,
        interaction: 'event-save',
        now: NOW,
      }),
    ).toBe(false);
    expect(
      isAppReviewEligible({
        accountCreatedAt,
        eventSaveCount: 3,
        interaction: 'event-save',
        now: NOW,
      }),
    ).toBe(true);
  });

  it('qualifies a successful calendar sync for an established account', () => {
    expect(
      isAppReviewEligible({
        accountCreatedAt: '2026-08-01T12:00:00.000Z',
        eventSaveCount: 0,
        interaction: 'calendar-sync',
        now: NOW,
      }),
    ).toBe(true);
  });
});
