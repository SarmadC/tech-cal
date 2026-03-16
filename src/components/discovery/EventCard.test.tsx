import type { ImgHTMLAttributes } from 'react';
import { screen } from '@/utils/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { render } from '@/utils/test-utils';

import EventCard from './EventCard';
import { buildEvent } from '@/tests/factories/eventFactories';

vi.mock('next/image', () => ({
    __esModule: true,
    // eslint-disable-next-line @next/next/no-img-element
    default: (props: ImgHTMLAttributes<HTMLImageElement>) => <img {...props} alt={props.alt ?? ''} />,
}));

vi.mock('./RecommendationContext', () => ({
    __esModule: true,
    default: () => null,
}));

vi.mock('@/components/calendar/ManagerJustificationModal', () => ({
    __esModule: true,
    default: () => null,
    prefetchManagerJustification: vi.fn(),
}));

vi.mock('@/components/social/NetworkAttendingBadge', () => ({
    __esModule: true,
    default: () => null,
}));

describe('Discovery EventCard', () => {
    it('prefers the organizer logo over the event image for the compact logo tile', () => {
        render(
            <EventCard
                event={buildEvent({
                    id: 'event-123',
                    updatedAt: '2026-03-16T19:07:31.285238+00:00',
                    eventImageUrl: 'https://example.com/event-image.png',
                    organization: {
                        id: 'org-123',
                        name: 'Postgres Conference',
                        logo: 'https://example.com/organizer-logo.png',
                    },
                })}
            />
        );

        const logoImage = screen.getByAltText('Postgres Conference logo');

        expect(logoImage).toHaveAttribute('src', 'https://example.com/organizer-logo.png');
    });
});
