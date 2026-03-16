import { render, screen } from '@/utils/test-utils';
import { describe, expect, it, vi } from 'vitest';

import type { Event } from '@/types';
import TimelineView from './TimelineView';

vi.mock('./TimelineEventCard', () => ({
    TimelineEventCard: ({ item, onClick }: { item: { title: string }; onClick: () => void }) => (
        <button type="button" onClick={onClick}>
            {item.title}
        </button>
    ),
}));

vi.mock('./TimelineDetailPanel', () => ({
    TimelineDetailPanel: ({ event }: { event: { title: string } }) => <div>{`detail:${event.title}`}</div>,
}));

function createEvent(overrides: Partial<Event> = {}): Event {
    return {
        id: 'event-1',
        createdAt: '2026-03-01T00:00:00.000Z',
        title: 'Sample Event',
        description: 'Sample description',
        organizer: 'Tech Calendar',
        location: 'Online',
        status: 'published',
        startTime: '2026-03-10T18:00:00.000Z',
        endTime: '2026-03-10T20:00:00.000Z',
        sourceUrl: 'https://example.com/event',
        livestreamUrl: null,
        eventTypeId: 'conference',
        timezone: 'UTC',
        ...overrides,
    };
}

describe('TimelineView', () => {
    it('does not mark same-time sessions on different dates as concurrent', () => {
        render(
            <TimelineView
                event={createEvent({
                    agenda: [
                        {
                            id: 'day-1-opening',
                            title: 'Opening Remarks',
                            startTime: '2024-03-01T18:00:00Z',
                            endTime: '2024-03-01T18:30:00Z',
                            type: 'talk',
                        },
                        {
                            id: 'day-2-opening',
                            title: 'Opening Remarks',
                            startTime: '2024-03-02T18:00:00Z',
                            endTime: '2024-03-02T18:30:00Z',
                            type: 'talk',
                        },
                    ],
                })}
            />
        );

        expect(screen.getByText(/Day 1 -/i)).toBeInTheDocument();
        expect(screen.getByText(/Day 2 -/i)).toBeInTheDocument();
        expect(screen.queryByText(/concurrent sessions/i)).not.toBeInTheDocument();
        expect(screen.getAllByText('Opening Remarks')).toHaveLength(2);
    });
});
