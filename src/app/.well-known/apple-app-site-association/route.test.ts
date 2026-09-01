import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';

describe('apple-app-site-association', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('fails closed when the Apple team is not configured', async () => {
    vi.stubEnv('APPLE_TEAM_ID', '');
    expect(GET().status).toBe(503);
  });

  it('serves production app paths without redirects', async () => {
    vi.stubEnv('APPLE_TEAM_ID', 'TEAM123');
    const response = GET();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    await expect(response.json()).resolves.toEqual({
      applinks: {
        apps: [],
        details: [{
          appIDs: ['TEAM123.com.kurecal.mobile'],
          components: [
            { '/': '/events/*' },
            { '/': '/u/*' },
            { '/': '/circle/*' },
          ],
        }],
      },
    });
  });
});
