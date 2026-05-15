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

    it('emits a static-safe policy in production compat mode', () => {
        vi.stubEnv('NODE_ENV', 'production');
        vi.stubEnv('CSP_STAGE', 'compat');

        const csp = buildCsp({
            frameAncestors: "'none'",
            nonce: 'compat-nonce',
        });
        const scriptSrc = getDirectiveValue(csp, 'script-src');

        expect(scriptSrc).toContain("'self'");
        expect(scriptSrc).toContain("'unsafe-inline'");
        expect(scriptSrc).not.toContain("'strict-dynamic'");
        expect(scriptSrc).not.toContain("'nonce-compat-nonce'");
        expect(scriptSrc).not.toContain("'unsafe-eval'");
    });

    it('keeps balanced mode static-safe in production', () => {
        vi.stubEnv('NODE_ENV', 'production');
        vi.stubEnv('CSP_STAGE', 'balanced');

        const csp = buildCsp({
            frameAncestors: "'none'",
            nonce: 'balanced-nonce',
        });
        const scriptSrc = getDirectiveValue(csp, 'script-src');

        expect(scriptSrc).toContain("'self'");
        expect(scriptSrc).toContain("'unsafe-inline'");
        expect(scriptSrc).not.toContain("'strict-dynamic'");
        expect(scriptSrc).not.toContain("'nonce-balanced-nonce'");
    });

    it('defaults production to a static-safe policy when CSP_STAGE is unset', () => {
        vi.stubEnv('NODE_ENV', 'production');
        vi.stubEnv('CSP_STAGE', '');

        const csp = buildCsp({
            frameAncestors: "'none'",
            nonce: 'default-nonce',
        });
        const scriptSrc = getDirectiveValue(csp, 'script-src');

        expect(scriptSrc).toContain("'unsafe-inline'");
        expect(scriptSrc).not.toContain("'strict-dynamic'");
        expect(scriptSrc).not.toContain("'nonce-default-nonce'");
    });

    it('downgrades CSP_STAGE=strict to compat unless CSP_STRICT_NONCE_MODE is enabled', () => {
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

    it('emits a nonce-based strict policy only when CSP_STRICT_NONCE_MODE is enabled', () => {
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
        expect(scriptSrc).not.toContain("'unsafe-eval'");
    });

    it('allows unsafe-eval in non-production compat mode only', () => {
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
