import { describe, expect, it } from 'vitest';

import { parseOptionalNonNegativeIntegerInput } from './eventFeedbackFormUtils';

describe('parseOptionalNonNegativeIntegerInput', () => {
  it('accepts nullable numeric input', () => {
    expect(parseOptionalNonNegativeIntegerInput('', 'LinkedIn requests')).toBeNull();
    expect(parseOptionalNonNegativeIntegerInput('7', 'LinkedIn requests')).toBe(7);
  });

  it('rejects invalid negative or non-numeric values', () => {
    expect(() =>
      parseOptionalNonNegativeIntegerInput('-1', 'LinkedIn requests')
    ).toThrow('Please enter a valid number of LinkedIn requests');
    expect(() =>
      parseOptionalNonNegativeIntegerInput('abc', 'LinkedIn requests')
    ).toThrow('Please enter a valid number of LinkedIn requests');
  });
});
