import { render, screen } from '@testing-library/react';
import EventProgress from '../EventProgress';
import { Event, AgendaItem } from '@/types';

// Mock event data for testing
const mockEvent: Event = {
    id: 'test-event-1',
    createdAt: '2024-01-01T00:00:00Z',
    title: 'Tech Conference 2024',
    description: 'A comprehensive tech conference covering the latest trends',
    organizer: 'Tech Events Inc.',
    location: 'San Francisco Convention Center',
    status: 'confirmed',
    startTime: '2024-03-15T09:00:00Z',
    endTime: '2024-03-15T17:00:00Z',
    sourceUrl: 'https://example.com',
    eventTypeId: 'conference'
};

// Mock agenda data - using future times for testing
const now = new Date();
const futureTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
const mockAgenda: AgendaItem[] = [
    {
        id: '1',
        title: 'Opening & Welcome',
        description: 'Event kickoff and introductions',
        startTime: futureTime.toISOString(),
        endTime: new Date(futureTime.getTime() + 30 * 60 * 1000).toISOString(),
        type: 'keynote',
        speaker: {
            id: 'speaker-1',
            name: 'Event Host',
            title: 'Conference Host'
        }
    },
    {
        id: '2',
        title: 'Session 1: AI Trends',
        description: 'Exploring the latest in artificial intelligence',
        startTime: new Date(futureTime.getTime() + 30 * 60 * 1000).toISOString(),
        endTime: new Date(futureTime.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        type: 'session',
        speaker: {
            id: 'speaker-2',
            name: 'Dr. Jane Smith',
            title: 'AI Researcher'
        }
    },
    {
        id: '3',
        title: 'Networking Break',
        description: 'Connect with fellow attendees',
        startTime: new Date(futureTime.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(futureTime.getTime() + 2.5 * 60 * 60 * 1000).toISOString(),
        type: 'networking'
    },
    {
        id: '4',
        title: 'Closing Remarks',
        description: 'Event wrap-up and next steps',
        startTime: new Date(futureTime.getTime() + 2.5 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(futureTime.getTime() + 3 * 60 * 60 * 1000).toISOString(),
        type: 'keynote',
        speaker: {
            id: 'speaker-3',
            name: 'Event Host',
            title: 'Conference Host'
        }
    }
];

describe('EventProgress', () => {
    it('renders progress component with agenda data', () => {
        render(<EventProgress event={mockEvent} agenda={mockAgenda} />);
        
        // Should show progress information
        expect(screen.getByText('Event Progress')).toBeInTheDocument();
        expect(screen.getByText('0/4 sessions')).toBeInTheDocument();
    });

    it('renders progress bar for live events', () => {
        // Create a live event for this test
        const liveEvent = {
            ...mockEvent,
            startTime: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
            endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 hours from now
        };
        
        render(<EventProgress event={liveEvent} agenda={mockAgenda} />);
        
        // Should have a progress bar
        const progressBar = screen.getByRole('progressbar');
        expect(progressBar).toBeInTheDocument();
    });

    it('handles empty agenda gracefully', () => {
        render(<EventProgress event={mockEvent} agenda={[]} />);
        
        // Should still render without crashing
        expect(screen.getByText('Event Progress')).toBeInTheDocument();
    });

    it('shows upcoming event status', () => {
        // Create an event that starts in the future
        const futureEvent = {
            ...mockEvent,
            startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
            endTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString()
        };
        
        render(<EventProgress event={futureEvent} agenda={mockAgenda} />);
        
        // Should show upcoming status
        expect(screen.getByText(/Event starts in/)).toBeInTheDocument();
    });

    it('shows completed event status', () => {
        // Create an event that ended in the past
        const pastEvent = {
            ...mockEvent,
            startTime: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 2 days ago
            endTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
        };
        
        // Create past agenda items
        const pastAgenda = mockAgenda.map(item => ({
            ...item,
            startTime: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
            endTime: new Date(Date.now() - 47 * 60 * 60 * 1000).toISOString()
        }));
        
        render(<EventProgress event={pastEvent} agenda={pastAgenda} />);
        
        // Should show completed sessions (the component shows live view with all sessions completed)
        expect(screen.getByText('4 sessions completed')).toBeInTheDocument();
    });
});
