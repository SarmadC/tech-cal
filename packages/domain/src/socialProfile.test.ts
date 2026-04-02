import { describe, expect, it } from 'vitest';

import {
  escapeLikePattern,
  isReservedUsername,
  isValidUsernameFormat,
  normalizeUsername,
  socialProfileUpdateSchema,
} from './socialProfile';

describe('domain social profile contract', () => {
  it('normalizes usernames before persistence checks', () => {
    expect(normalizeUsername('  demo-user  ')).toBe('demo-user');
  });

  it('validates the username format and reserved list', () => {
    expect(isValidUsernameFormat('demo-user')).toBe(true);
    expect(isValidUsernameFormat('1demo')).toBe(false);
    expect(isReservedUsername('calendar')).toBe(true);
    expect(isReservedUsername('demo-user')).toBe(false);
  });

  it('escapes like patterns for case-insensitive lookup', () => {
    expect(escapeLikePattern('demo_%\\user')).toBe('demo\\_\\%\\\\user');
  });

  it('accepts the shared profile update payload shape', () => {
    expect(
      socialProfileUpdateSchema.parse({
        username: 'demo-user',
        headline: 'Builder',
        profileVisibility: 'connections',
        showAttendance: true,
      })
    ).toEqual({
      username: 'demo-user',
      headline: 'Builder',
      profileVisibility: 'connections',
      showAttendance: true,
    });
  });
});
