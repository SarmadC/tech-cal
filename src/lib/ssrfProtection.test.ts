import { describe, expect, it } from 'vitest';
import { validateUrlForServerFetch } from './ssrfProtection';

describe('validateUrlForServerFetch', () => {
    it('rejects IPv6-mapped loopback hosts', async () => {
        const result = await validateUrlForServerFetch('http://[::ffff:127.0.0.1]/private');

        expect(result.valid).toBe(false);
        if (!result.valid) {
            expect(result.reason).toBe('Private or loopback addresses are not allowed');
        }
    });

    it('allows unresolved public hostnames when explicitly requested', async () => {
        const result = await validateUrlForServerFetch('https://example.com/event', {
            allowUnresolvedHostnames: true,
        });

        expect(result.valid).toBe(true);
    });
});
