import { beforeEach, describe, expect, it, vi } from 'vitest';
import sitemap from '@/app/sitemap';
import { createClient } from '@/utils/supabase/server';
import { SITE_URL } from '@/config/site';

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}));

type QueryResult = {
  data: unknown[] | null;
};

function buildQuery(result: QueryResult) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    lte: vi.fn(() => query),
    order: vi.fn(() => query),
    gte: vi.fn(() => query),
    not: vi.fn(() => query),
    then: (onFulfilled: (value: QueryResult) => unknown, onRejected?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
  };

  return query;
}

function buildSupabaseMock() {
  return {
    from: vi.fn((table: string) => {
      if (table === 'posts') {
        return buildQuery({
          data: [
            {
              slug: 'nvidia-gtc-2026',
              updated_at: '2026-02-10T02:35:24.437Z',
              published_at: '2026-02-10T02:35:24.437Z',
            },
          ],
        });
      }

      if (table === 'event_type') {
        return buildQuery({
          data: [{ name: 'Conference' }, { name: 'Workshop' }],
        });
      }

      if (table === 'events') {
        let selected = '';
        const eventsQuery = {
          select: vi.fn((selection: unknown) => {
            selected = String(selection);
            return eventsQuery;
          }),
          eq: vi.fn(() => eventsQuery),
          lte: vi.fn(() => eventsQuery),
          order: vi.fn(() => eventsQuery),
          gte: vi.fn(() => eventsQuery),
          not: vi.fn(() => eventsQuery),
          then: (
            onFulfilled: (value: QueryResult) => unknown,
            onRejected?: (reason: unknown) => unknown
          ) => {
            if (selected.includes('location_city')) {
              return Promise.resolve({
                data: [{ location_city: 'San Francisco' }, { location_city: 'New York' }],
              }).then(onFulfilled, onRejected);
            }

            if (selected.includes('slug')) {
              return Promise.resolve({
                data: [
                  {
                    slug: 'devcon-2026',
                    updated_at: '2026-02-01T00:00:00.000Z',
                    start_time: '2026-05-01T00:00:00.000Z',
                  },
                  {
                    slug: null,
                    updated_at: '2026-02-01T00:00:00.000Z',
                    start_time: '2026-06-01T00:00:00.000Z',
                  },
                ],
              }).then(onFulfilled, onRejected);
            }

            return Promise.resolve({ data: [] }).then(onFulfilled, onRejected);
          },
        };

        return eventsQuery;
      }

      return buildQuery({ data: [] });
    }),
  };
}

describe('sitemap', () => {
  const mockedCreateClient = vi.mocked(createClient);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('includes category/city/resource pages and emits canonical www host URLs', async () => {
    mockedCreateClient.mockResolvedValue(buildSupabaseMock() as never);

    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain(`${SITE_URL}/events/category/conferences`);
    expect(urls).toContain(`${SITE_URL}/events/category/workshops`);
    expect(urls).toContain(`${SITE_URL}/events/cities/san-francisco`);
    expect(urls).toContain(`${SITE_URL}/events/cities/new-york`);
    expect(urls).toContain(`${SITE_URL}/resources/tech-events-calendar-2026`);
    expect(urls).toContain(`${SITE_URL}/resources/cfp-calendar`);
    expect(urls).not.toContain(`${SITE_URL}/login`);
    expect(urls).not.toContain(`${SITE_URL}/signup`);
    expect(urls).not.toContain(`${SITE_URL}/events/null`);
    expect(urls.every((url) => url.startsWith(SITE_URL))).toBe(true);
  });

  it('falls back to static + resource pages when Supabase fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockedCreateClient.mockRejectedValue(new Error('supabase unavailable'));

    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain(`${SITE_URL}/events`);
    expect(urls).toContain(`${SITE_URL}/resources/tech-events-calendar-2026`);
    expect(urls).toContain(`${SITE_URL}/resources/cfp-calendar`);
    expect(urls).not.toContain(`${SITE_URL}/events/devcon-2026`);

    consoleErrorSpy.mockRestore();
  });
});
