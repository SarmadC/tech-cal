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
vi.mock('@/contexts/SnackbarContext', () => ({
    SnackbarProvider: ({ children }: { children: unknown }) => children,
    useSnackbar: () => ({
        showSuccess: vi.fn(),
        showError: vi.fn(),
        showWarning: vi.fn(),
        showInfo: vi.fn(),
        showConfirmation: vi.fn()
    })
}));

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

    // Mock fetch globally
    global.fetch = vi.fn();

    // This runs before each test, ensuring our mocks are clean for every scenario
    beforeEach(() => {
        vi.clearAllMocks(); // Resets call counts for our mock functions
        // Mock fetch to resolve successfully
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ success: true }),
        } as Response);
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
        expect(parentDiv).toHaveTextContent(/sign in to manage attendance/i);
    });

    it('should show tracking options if the user is logged in and the event is not tracked', async () => {
        // Arrange: Mock getTrackedEvents to return empty array (event not tracked)
        vi.spyOn(UserEventService.UserEventService, 'getTrackedEvents')
            .mockResolvedValue([]);

        // Act: Render with a logged-in user
        render(<EventTracking event={mockEvent} />, { mockUser });

        // Assert: Wait for loading to complete, then check for attendance button
        // The component shows an attendance toggle button when not tracked
        await screen.findByText(/not attending/i, {}, { timeout: 5000 });
        const attendanceButton = screen.getByRole('button', { name: /attending/i });
        expect(attendanceButton).toBeInTheDocument();
    });

    it('should call setAttendanceStatus when the user clicks attendance button', async () => {
        // Arrange: Mock getTrackedEvents to return empty array (event not tracked)
        vi.spyOn(UserEventService.UserEventService, 'getTrackedEvents')
            .mockResolvedValue([]);
        
        // Mock setAttendanceStatus
        const setAttendanceStatusSpy = vi.spyOn(UserEventService.UserEventService, 'setAttendanceStatus')
            .mockResolvedValue({ previousStatus: null, newStatus: 'attending', autoBookmarked: true });

        render(<EventTracking event={mockEvent} />, { mockUser });

        // Wait for component to load
        await screen.findByText(/not attending/i, {}, { timeout: 5000 });

        // Act: Click the attendance button
        const attendanceButton = screen.getByRole('button', { name: /attending/i });
        await user.click(attendanceButton);

        // Assert: Check that setAttendanceStatus was called
        expect(setAttendanceStatusSpy).toHaveBeenCalledTimes(1);
        expect(setAttendanceStatusSpy).toHaveBeenCalledWith(
            mockUser.id,
            mockEvent.id,
            'attending',
            undefined,
            expect.anything() // supabase client
        );
    });

    it('should show the current status if the event is already tracked', async () => {
        // Arrange: Mock getTrackedEvents to return event with attending status
        vi.spyOn(UserEventService.UserEventService, 'getTrackedEvents')
            .mockResolvedValue([{
                trackingId: 'track-123',
                userId: mockUser.id,
                eventId: mockEvent.id,
                isBookmarked: true,
                bookmarkedAt: new Date().toISOString(),
                status: 'attending',
                notes: null,
                trackedAt: new Date().toISOString(),
                event: null
            }]);

        render(<EventTracking event={mockEvent} />, { mockUser });

        // Assert: Wait for component to load and check for attending status
        await screen.findByText(/attending/i, {}, { timeout: 5000 });
        // The component shows the attendance status, not a "remove" button
        // It shows a toggle button to change status
        expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should call setAttendanceStatus with null when removing attendance', async () => {
        // Arrange: Mock getTrackedEvents to return event with attended status
        // (when status is 'attended', nextAction is null, so clicking will remove attendance)
        vi.spyOn(UserEventService.UserEventService, 'getTrackedEvents')
            .mockResolvedValue([{
                trackingId: 'track-123',
                userId: mockUser.id,
                eventId: mockEvent.id,
                isBookmarked: true,
                bookmarkedAt: new Date().toISOString(),
                status: 'attended',
                notes: null,
                trackedAt: new Date().toISOString(),
                event: null
            }]);
        
        const setAttendanceStatusSpy = vi.spyOn(UserEventService.UserEventService, 'setAttendanceStatus')
            .mockResolvedValue({ previousStatus: 'attended', newStatus: null, autoBookmarked: false });

        render(<EventTracking event={mockEvent} />, { mockUser });

        // Wait for component to load
        await screen.findByText(/attended/i, {}, { timeout: 5000 });

        // Act: Click the button to remove attendance (toggle off)
        const toggleButton = screen.getByRole('button');
        await user.click(toggleButton);

        // Assert: Check that setAttendanceStatus was called with null
        expect(setAttendanceStatusSpy).toHaveBeenCalledTimes(1);
        expect(setAttendanceStatusSpy).toHaveBeenCalledWith(
            mockUser.id,
            mockEvent.id,
            null,
            undefined,
            expect.anything() // supabase client
        );
    });
});