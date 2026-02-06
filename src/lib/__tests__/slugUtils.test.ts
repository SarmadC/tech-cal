import { describe, it, expect } from 'vitest';
import { generateSlug } from '../slugUtils';

describe('generateSlug', () => {
    it('converts to lowercase', () => {
        expect(generateSlug('Hello World')).toBe('hello-world');
    });

    it('handles trimming', () => {
        expect(generateSlug('  Hello World  ')).toBe('hello-world');
    });

    it('handles accents', () => {
        expect(generateSlug('Crème Brûlée')).toBe('creme-brulee');
        expect(generateSlug('München')).toBe('munchen');
    });

    it('handles special characters', () => {
        expect(generateSlug('C# & C++')).toBe('c-c');
        expect(generateSlug('What? No!')).toBe('what-no');
    });

    it('collapses multiple hyphens', () => {
        expect(generateSlug('a - b')).toBe('a-b');
        expect(generateSlug('foo   bar')).toBe('foo-bar');
    });

    it('removes leading and trailing hyphens', () => {
        expect(generateSlug('-hello-')).toBe('hello');
        expect(generateSlug('---world')).toBe('world');
    });

    it('handles empty input', () => {
        expect(generateSlug('')).toBe('');
        // @ts-ignore
        expect(generateSlug(null)).toBe('');
    });
});
