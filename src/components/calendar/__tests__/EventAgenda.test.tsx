import { render, screen } from '@testing-library/react';
import EventAgenda from '../EventAgenda';
import { Event } from '@/types';

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
    eventTypeId: 'conference',
    agendaUrl: 'https://example.com/agenda',
    speakerLineup: [
        {
            id: 'speaker-1',
            name: 'John Doe',
            title: 'CTO',
            company: 'Tech Corp',
            photoUrl: 'https://example.com/photo1.jpg'
        },
        {
            id: 'speaker-2',
            name: 'Jane Smith',
            title: 'VP Engineering',
            company: 'Innovation Labs'
        }
    ]
};

describe('EventAgenda', () => {
    it('renders agenda header with title', () => {
        render(<EventAgenda event={mockEvent} />);
        expect(screen.getByText('Event Agenda')).toBeInTheDocument();
    });

    it('renders external agenda link when agendaUrl is provided', () => {
        render(<EventAgenda event={mockEvent} />);
        const link = screen.getByText('View Full Agenda');
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', 'https://example.com/agenda');
        expect(link).toHaveAttribute('target', '_blank');
    });

    it('renders agenda items with proper structure', () => {
        render(<EventAgenda event={mockEvent} />);
        
        // Check for agenda items (the real data shows AWS re:Invent items)
        expect(screen.getByText('Badge pickup')).toBeInTheDocument();
        expect(screen.getByText('Badge pickup and help desk')).toBeInTheDocument();
        expect(screen.getByText('AWS Certification verification desk')).toBeInTheDocument();
    });

    it('renders speaker information when speakerLineup is provided', () => {
        render(<EventAgenda event={mockEvent} />);
        
        expect(screen.getByText('Featured Speakers')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('CTO')).toBeInTheDocument();
        expect(screen.getByText('VP Engineering')).toBeInTheDocument();
    });

    it('renders different agenda item types with proper styling', () => {
        render(<EventAgenda event={mockEvent} />);
        
        // Check for type badges - use getAllByText since there are multiple items of each type
        const registrationBadges = screen.getAllByText('registration');
        const certificationBadges = screen.getAllByText('certification');
        
        expect(registrationBadges.length).toBeGreaterThan(0);
        expect(certificationBadges.length).toBeGreaterThan(0);
    });

    it('handles events without agenda data gracefully', () => {
        const eventWithoutAgenda = { ...mockEvent, agendaUrl: null, speakerLineup: null };
        render(<EventAgenda event={eventWithoutAgenda} />);
        
        // Should still render the agenda header
        expect(screen.getByText('Event Agenda')).toBeInTheDocument();
        
        // Should not render external link
        expect(screen.queryByText('View Full Agenda')).not.toBeInTheDocument();
        
        // Should not render speakers section
        expect(screen.queryByText('Featured Speakers')).not.toBeInTheDocument();
    });
});
