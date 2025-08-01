// src/lib/calendarUtils.test.ts

import { describe, it, expect } from 'vitest';
import { formatToUTC } from '../lib/calendarUtils';

describe('formatToUTC', () => {
    it('should correctly format a date object into a UTC string', () => {
        // Arrange: Set up the input data
        const date = new Date('2024-09-09T10:30:00.000Z');

        // Act: Call the function we are testing
        const result = formatToUTC(date);

        // Assert: Check if the output is what we expect
        expect(result).toBe('20240909T103000Z');
    });

    it('should handle single-digit months and days by padding them', () => {
        const date = new Date('2024-01-05T03:04:05.000Z');
        const result = formatToUTC(date);
        expect(result).toBe('20240105T030405Z');
    });

    it('should return an empty string if the input is null', () => {
        const result = formatToUTC(null);
        expect(result).toBe('');
    });
});