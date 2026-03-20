import { describe, expect, it } from 'vitest';
import { resolveLegacyCommunityRedirect } from '@/components/social/community-page-shared';

describe('community-page-shared helpers', () => {
  it('redirects legacy community params back to the feed home', () => {
    expect(
      resolveLegacyCommunityRedirect({
        tab: 'directory',
      })
    ).toBe('/community');
    expect(
      resolveLegacyCommunityRedirect({
        search: 'devrel',
      })
    ).toBe('/community');
    expect(
      resolveLegacyCommunityRedirect({
        q: 'speaker',
      })
    ).toBe('/community');
    expect(
      resolveLegacyCommunityRedirect({
        cursor: 'cursor-1',
      })
    ).toBe('/community');
    expect(
      resolveLegacyCommunityRedirect({
        tab: 'circles',
      })
    ).toBe('/community');
    expect(
      resolveLegacyCommunityRedirect({
        tab: 'feed',
      })
    ).toBeNull();
    expect(resolveLegacyCommunityRedirect({})).toBeNull();
  });
});
