import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildCsp } from './csp';

function getDirectiveValue(csp: string, directive: string): string {
    const match = csp.match(new RegExp(`${directive} ([^;]+)`));
    return match?.[1] ?? '';
}

describe('buildCsp', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('defaults production to a static-safe policy', () => {
        vi.stubEnv('NODE_ENV', 'production');
        vi.stubEnv('CSP_STAGE', '');

        const csp = buildCsp({
            frameAncestors: "'none'",
            nonce: 'default-nonce',
        });
        const scriptSrc = getDirectiveValue(csp, 'script-src');

        expect(scriptSrc).toContain("'self'");
        expect(scriptSrc).toContain("'unsafe-inline'");
        expect(scriptSrc).not.toContain("'strict-dynamic'");
        expect(scriptSrc).not.toContain("'nonce-default-nonce'");
    });

    it('downgrades strict mode unless nonce propagation is explicitly enabled', () => {
        vi.stubEnv('NODE_ENV', 'production');
        vi.stubEnv('CSP_STAGE', 'strict');

        const csp = buildCsp({
            frameAncestors: "'none'",
            nonce: 'strict-nonce',
        });
        const scriptSrc = getDirectiveValue(csp, 'script-src');

        expect(scriptSrc).toContain("'unsafe-inline'");
        expect(scriptSrc).not.toContain("'strict-dynamic'");
        expect(scriptSrc).not.toContain("'nonce-strict-nonce'");
    });

    it('emits a nonce-based strict policy only when explicitly enabled', () => {
        vi.stubEnv('NODE_ENV', 'production');
        vi.stubEnv('CSP_STAGE', 'strict');
        vi.stubEnv('CSP_STRICT_NONCE_MODE', 'true');

        const csp = buildCsp({
            frameAncestors: "'none'",
            nonce: 'strict-nonce',
        });
        const scriptSrc = getDirectiveValue(csp, 'script-src');

        expect(scriptSrc).toContain("'nonce-strict-nonce'");
        expect(scriptSrc).toContain("'strict-dynamic'");
        expect(scriptSrc).not.toContain("'unsafe-inline'");
    });

    it('allows unsafe-eval in non-production static-safe mode only', () => {
        vi.stubEnv('NODE_ENV', 'development');
        vi.stubEnv('CSP_STAGE', 'compat');

        const csp = buildCsp({
            frameAncestors: '*',
            nonce: 'dev-nonce',
        });
        const scriptSrc = getDirectiveValue(csp, 'script-src');

        expect(scriptSrc).toContain("'unsafe-inline'");
        expect(scriptSrc).toContain("'unsafe-eval'");
        expect(scriptSrc).not.toContain("'nonce-dev-nonce'");
    });
});
