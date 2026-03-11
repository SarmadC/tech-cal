import { describe, expect, it } from 'vitest';
import { resolveSeedAllowedHosts } from '../LLMEnrichmentService';

describe('resolveSeedAllowedHosts', () => {
    it('keeps the deterministic seed crawl same-host only when agentic crawl is off', () => {
        expect(resolveSeedAllowedHosts('https://conf.test/event', 'off')).toBeUndefined();
    });

    it('allows vendor hosts during the seed crawl when agentic crawl is enabled', () => {
        expect(resolveSeedAllowedHosts('https://conf.test/event', 'shadow')).toEqual(
            expect.arrayContaining(['conf.test', 'sched.com', 'sessionize.com', 'swapcard.com'])
        );
        expect(resolveSeedAllowedHosts('https://conf.test/event', 'assist')).toEqual(
            expect.arrayContaining(['conf.test', 'sched.com', 'sessionize.com', 'swapcard.com'])
        );
    });
});
