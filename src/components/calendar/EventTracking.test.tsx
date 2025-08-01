// src/components/calendar/EventTracking.test.tsx

import { screen } from '@/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import EventTracking from './EventTracking';
import { AppEvent } from '@/types';
import * as UserEventService from '@/services/userEventService';
import { createMockUser, render } from '@/utils/test-utils';

// --- MOCKING THE SERVICE LAYER ---
// This tells Vitest: "Whenever any code imports from '@/services/userEventService',
// give them this fake version instead of the real one."
vi.mock('@/services/userEventService');

// Create a mock AppEvent object for our tests to use
const mockEvent: AppEvent = {
    id: 'event-abc',
    title: 'Test Event',
    // ... fill in other required AppEvent properties
    createdAt: '', description: '', startTime: '', endTime: null, organizer: '', location: '', status: '', sourceUrl: '', livestreamUrl: null, eventTypeId: ''
};

describe('EventTracking Component', () => {
    const user = userEvent.setup();
    const mockUser = createMockUser();

    // This runs before each test, ensuring our mocks are clean for every scenario
    beforeEach(() => {
        vi.clearAllMocks(); // Resets call counts for our mock functions
    });

    it('should show a "Sign in" link if the user is logged out', () => {
        // Arrange: Render the component with no user
        render(<EventTracking event={mockEvent} />, { mockUser: null });

        // Assert
        expect(screen.getByText(/sign in to track this event/i)).toBeInTheDocument();
    });

    it('should show tracking options if the user is logged in and the event is not tracked', async () => {
        // Arrange: Tell our mock service to simulate a successful API call
        vi.spyOn(UserEventService.UserEventService, 'isEventTracked')
            .mockResolvedValue({ success: true, data: { isTracked: false } });

        // Act: Render with a logged-in user
        render(<EventTracking event={mockEvent} />, { mockUser });

        // Assert: Use findBy to wait for the component to finish loading its data
        const bookmarkButton = await screen.findByRole('button', { name: /bookmark/i });
        expect(bookmarkButton).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /attending/i })).toBeInTheDocument();
    });

    it('should call the trackEvent service when the user clicks "Bookmark"', async () => {
        // Arrange
        vi.spyOn(UserEventService.UserEventService, 'isEventTracked')
            .mockResolvedValue({ success: true, data: { isTracked: false } });
        const trackEventSpy = vi.spyOn(UserEventService.UserEventService, 'trackEvent')
            .mockResolvedValue({ success: true });

        render(<EventTracking event={mockEvent} />, { mockUser });

        // Act
        const bookmarkButton = await screen.findByRole('button', { name: /bookmark/i });
        await user.click(bookmarkButton);

        // Assert
        expect(trackEventSpy).toHaveBeenCalledTimes(1);
        expect(trackEventSpy).toHaveBeenCalledWith(
            mockUser.id,
            mockEvent.id,
            'bookmarked', // The status we expect
            undefined // The notes field
        );
    });

    it('should show the current status and a "Remove" button if the event is already tracked', async () => {
        // Arrange
        vi.spyOn(UserEventService.UserEventService, 'isEventTracked')
            .mockResolvedValue({ success: true, data: { isTracked: true, status: 'attending' } });

        render(<EventTracking event={mockEvent} />, { mockUser });

        // Assert
        expect(await screen.findByText(/tracked as attending/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
    });

    it('should call the untrackEvent service when the user clicks "Remove"', async () => {
        // Arrange
        vi.spyOn(UserEventService.UserEventService, 'isEventTracked')
            .mockResolvedValue({ success: true, data: { isTracked: true, status: 'attending' } });
        const untrackEventSpy = vi.spyOn(UserEventService.UserEventService, 'untrackEvent')
            .mockResolvedValue({ success: true });

        render(<EventTracking event={mockEvent} />, { mockUser });

        // Act
        const removeButton = await screen.findByRole('button', { name: /remove/i });
        await user.click(removeButton);

        // Assert
        expect(untrackEventSpy).toHaveBeenCalledTimes(1);
        expect(untrackEventSpy).toHaveBeenCalledWith(mockUser.id, mockEvent.id);
    });
});