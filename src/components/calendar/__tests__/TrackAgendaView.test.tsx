import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import TrackAgendaView, { getTrackAccent, groupAgendaByTrack } from '../TrackAgendaView';
import { AgendaItem } from '@/types';

vi.mock('next-themes', () => ({
    useTheme: () => ({ theme: 'light' })
}));

const baseAgenda: AgendaItem[] = [
    {
        id: '1',
        title: 'Opening Keynote',
        startTime: '2024-03-01T09:00:00Z',
        endTime: '2024-03-01T10:00:00Z',
        type: 'keynote',
        track: 'Main',
        description: 'Kick-off the conference with key announcements.',
        location: 'Hall A'
    },
    {
        id: '2',
        title: 'AI Lab',
        startTime: '2024-03-01T09:00:00Z',
        endTime: '2024-03-01T09:45:00Z',
        type: 'workshop',
        track: 'ai',
        description: 'Hands-on exploration of new ML tooling.',
        location: 'Room 101'
    },
    {
        id: '3',
        title: 'AI Lab (Part 2)',
        startTime: '2024-03-01T10:00:00Z',
        endTime: '2024-03-01T10:45:00Z',
        type: 'workshop',
        track: 'ai',
        location: 'Room 101'
    },
    {
        id: '4',
        title: 'No Track Session',
        startTime: '2024-03-01T11:00:00Z',
        endTime: '2024-03-01T11:30:00Z',
        type: 'session'
    }
];

describe('groupAgendaByTrack', () => {
    it('groups agenda items by track and ignores untracked sessions', () => {
        const grouped = groupAgendaByTrack(baseAgenda);
        expect(grouped).toHaveLength(2);
        expect(grouped[0].track).toBe('ai');
        expect(grouped[0].items.map(item => item.id)).toEqual(['2', '3']);
    });
});

describe('getTrackAccent', () => {
    it('returns deterministic palette entries per track', () => {
        const first = getTrackAccent('AI');
        const second = getTrackAccent('AI');

        expect(first).toEqual(second);
        expect(first).toHaveProperty('bg');
        expect(first).toHaveProperty('text');
        expect(first).toHaveProperty('border');
    });
});

describe('TrackAgendaView', () => {
    it('renders track columns with their sessions', () => {
        const grouped = groupAgendaByTrack(baseAgenda);
        render(<TrackAgendaView tracks={grouped} />);

        expect(screen.getByLabelText(/Main Track track/i)).toBeInTheDocument();
        expect(screen.getByText('Opening Keynote')).toBeInTheDocument();
        expect(screen.getByText('AI Lab')).toBeInTheDocument();
    });
});

