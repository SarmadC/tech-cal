import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import EventPage from './page';

const mocks = vi.hoisted(() => ({
    event: vi.fn(),
}));

vi.mock('next/headers', () => ({
    headers: vi.fn(async () => ({
        get: vi.fn(() => null),
    })),
}));

vi.mock('next/navigation', () => ({
    notFound: vi.fn(() => {
        throw new Error('notFound');
    }),
    redirect: vi.fn(),
}));

vi.mock('next/image', () => ({
    default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} alt={props.alt ?? ''} />,
}));

vi.mock('@/utils/supabase/server', () => ({
    createClient: vi.fn(async () => ({
        from: vi.fn((table: string) => {
            if (table !== 'events') {
                throw new Error(`Unexpected table ${table}`);
            }

            const query = {
                select: vi.fn(() => query),
                eq: vi.fn(() => query),
                single: vi.fn(async () => ({ data: mocks.event(), error: null })),
            };

            return query;
        }),
    })),
}));

vi.mock('@/utils/supabase/service', () => ({
    createServiceClient: vi.fn(() => ({
        from: vi.fn((table: string) => {
            if (table !== 'events') {
                throw new Error(`Unexpected table ${table}`);
            }

            const query = {
                select: vi.fn(() => query),
                eq: vi.fn(() => query),
                single: vi.fn(async () => ({ data: mocks.event(), error: null })),
            };

            return query;
        }),
    })),
}));

vi.mock('@/components/seo', () => ({
    EventJsonLd: () => null,
    BreadcrumbJsonLd: () => null,
}));

vi.mock('@/utils/transformers', () => ({
    transformAgendaItemsToApp: vi.fn(() => []),
}));

vi.mock('@/components/events/EventAgendaSection', () => ({
    EventAgendaSection: () => <div data-testid="agenda-section" />,
}));

vi.mock('@/components/events/BookmarkEventButton', () => ({
    default: () => <div data-testid="bookmark-button" />,
}));

vi.mock('@/components/events/AttendanceEventButton', () => ({
    default: (props: { label?: string }) => (
        <div data-testid="attendance-button">{props.label ?? 'attendance'}</div>
    ),
}));

vi.mock('@/components/social/ShareButtons', () => ({
    ShareButtons: () => <div data-testid="share-buttons" />,
}));

vi.mock('@/components/events/WhosGoingSection', () => ({
    default: () => <div data-testid="whos-going" />,
}));

vi.mock('@/components/events/PublicEventMoreActions', () => ({
    default: () => <div data-testid="more-actions" />,
}));

vi.mock('@/components/events/PublicEventShortcuts', () => ({
    default: () => null,
}));

vi.mock('@/utils/logoUtils', () => ({
    getLogoUrlFromInput: vi.fn(() => null),
}));

function buildEvent(overrides: Partial<Record<string, unknown>> = {}) {
    return {
        id: 'event-1',
        slug: 'builders-night',
        title: 'Builders Night',
        description: 'A community-built meetup',
        start_time: '2026-05-01T18:30:00.000Z',
        end_time: null,
        location: 'Edmonton',
        source_url: null,
        registration_url: null,
        registration_mode: 'native',
        ingestion_provenance: 'user_submitted',
        livestream_url: null,
        event_image_url: null,
        price_range: null,
        price_min: null,
        price_max: null,
        currency: null,
        event_format: 'In-person',
        difficulty: null,
        target_audience: null,
        status: 'confirmed',
        event_type: { id: 'type-1', name: 'Meetup', color: '#fff' },
        organizer: { id: 'org-1', name: 'Kure', logo_url: null },
        agenda: [{ id: 'agenda-1', start_time: '2026-05-01T18:30:00.000Z', end_time: null, title: 'Welcome', description: null, location: null, agenda_type: null, track: null, topics: [] }],
        series: null,
        series_id: null,
        ...overrides,
    };
}

describe('EventPage CTA behavior', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.NEXT_PUBLIC_SUPABASE_URL = '';
        process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    });

    it('shows native RSVP as the primary action for Kure-Cal-original submitted events', async () => {
        mocks.event.mockReturnValue(buildEvent());

        render(await EventPage({ params: Promise.resolve({ slug: 'builders-night' }) }));

        expect(screen.getAllByText('RSVP on Kure-Cal').length).toBeGreaterThan(0);
        expect(screen.queryByRole('link', { name: 'Register on website' })).not.toBeInTheDocument();
    });

    it('shows external registration CTA when the event has an external registration URL', async () => {
        mocks.event.mockReturnValue(buildEvent({
            registration_mode: 'external',
            registration_url: 'https://example.com/register',
        }));

        render(await EventPage({ params: Promise.resolve({ slug: 'builders-night' }) }));

        expect(screen.getByRole('link', { name: /Register on website/ })).toHaveAttribute(
            'href',
            'https://example.com/register'
        );
        expect(screen.queryByText('RSVP on Kure-Cal')).not.toBeInTheDocument();
    });
});
