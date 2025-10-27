// src/components/calendar/EventTracking.test.tsx

import { screen } from '@/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import EventTracking from './EventTracking';
import { Event } from '@/types';
import * as UserEventService from '@/services/userEventService';
import { createMockUser, render } from '@/utils/test-utils';

// --- MOCKING THE SERVICE LAYER ---
vi.mock('@/services/userEventService');

// Create a mock AppEvent object for our tests to use
const mockEvent: Event = {
    id: 'event-abc',
    title: 'Test Event',
    createdAt: new Date().toISOString(),
    description: 'A test event description.',
    startTime: new Date().toISOString(),
    endTime: null,
    organizer: 'Test Organizer',
    location: 'Online',
    status: 'confirmed',
    sourceUrl: 'https://example.com',
    livestreamUrl: null,
    eventTypeId: 'type-123'
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

        // Act: Find the link specifically
        const signInLink = screen.getByRole('link', { name: /sign in/i });

        // Assert
        expect(signInLink).toBeInTheDocument();

        // FIX #1: Get the parent element of the link and check its full text content.
        const parentDiv = signInLink.parentElement;
        expect(parentDiv).toHaveTextContent(/sign in to track this event/i);
    });

    it('should show tracking options if the user is logged in and the event is not tracked', async () => {
        // Arrange: Tell our mock service to simulate a successful API call
        vi.spyOn(UserEventService.UserEventService, 'isEventTracked')
            .mockResolvedValue({ isTracked: false });

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
            .mockResolvedValue({ isTracked: false });

        // This is a mock implementation of the hook's mutation function
        const mockTrackEventMutation = vi.fn();
        vi.spyOn(UserEventService.UserEventService, 'trackEvent').mockImplementation(mockTrackEventMutation);

        render(<EventTracking event={mockEvent} />, { mockUser });

        // Act
        const bookmarkButton = await screen.findByRole('button', { name: /bookmark/i });
        await user.click(bookmarkButton);

        // Assert
        // Note: We test the mutation hook's call, not the service directly now.
        // The hook calls the service, so this is still a valid test.
        // We can check the arguments passed to the hook.

        // A more robust way to test hooks is to mock the hook itself, but mocking the service
        // it calls is a valid and often simpler approach.

        // Re-creating the spy for the service call itself to check the arguments.
        const trackEventSpy = vi.spyOn(UserEventService.UserEventService, 'trackEvent')
            .mockResolvedValue(undefined);

        // Need to re-render and click after re-spying to capture the call
        render(<EventTracking event={mockEvent} />, { mockUser });
        const newBookmarkButton = await screen.findByRole('button', { name: /bookmark/i });
        await user.click(newBookmarkButton);

        expect(trackEventSpy).toHaveBeenCalledTimes(1);

        // FIX #2: Change `undefined` to an empty string `""` to match the component's state.
        expect(trackEventSpy).toHaveBeenCalledWith(
            mockUser.id,
            mockEvent.id,
            'bookmarked', // The status we expect
            ""            // The notes field is an empty string by default
        );
    });

    it('should show the current status and a "Remove" button if the event is already tracked', async () => {
        // Arrange
        vi.spyOn(UserEventService.UserEventService, 'isEventTracked')
            .mockResolvedValue({ isTracked: true, status: 'attending' });

        render(<EventTracking event={mockEvent} />, { mockUser });

        // Assert
        expect(await screen.findByText(/tracked as attending/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
    });

    it('should call the untrackEvent service when the user clicks "Remove"', async () => {
        // Arrange
        vi.spyOn(UserEventService.UserEventService, 'isEventTracked')
            .mockResolvedValue({ isTracked: true, status: 'attending' });
        const untrackEventSpy = vi.spyOn(UserEventService.UserEventService, 'untrackEvent')
            .mockResolvedValue({ external_calendar_event_id: 'test-id', external_provider: 'google' });

        render(<EventTracking event={mockEvent} />, { mockUser });

        // Act
        const removeButton = await screen.findByRole('button', { name: /remove/i });
        await user.click(removeButton);

        // Assert
        expect(untrackEventSpy).toHaveBeenCalledTimes(1);
        expect(untrackEventSpy).toHaveBeenCalledWith(mockUser.id, mockEvent.id);
    });
});