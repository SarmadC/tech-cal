import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import UpdateReviewClient from './UpdateReviewClient';

const push = vi.fn();
const showSuccess = vi.fn();
const showError = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push }),
}));

vi.mock('@/contexts/SnackbarContext', () => ({
    useSnackbar: () => ({
        showConfirmation: (_title: string, _message: string, onConfirm: () => void) => onConfirm(),
        showError,
        showSuccess,
    }),
}));

describe('UpdateReviewClient', () => {
    beforeEach(() => {
        push.mockReset();
        showSuccess.mockReset();
        showError.mockReset();

        global.fetch = vi.fn(async (input) => {
            const url = String(input);

            if (url.includes('action=delete-event')) {
                return {
                    ok: true,
                    json: async () => ({ success: true }),
                } as Response;
            }

            if (url.startsWith('/api/admin/ingestion/update-queue?')) {
                return {
                    ok: true,
                    json: async () => ({
                        items: [
                            {
                                id: 'queue-1',
                                event: { title: 'Current Event' },
                            },
                            {
                                id: 'queue-2',
                                event: { title: 'Next Event' },
                            },
                        ],
                    }),
                } as Response;
            }

            throw new Error(`Unexpected fetch: ${url}`);
        }) as typeof fetch;
    });

    it('auto-advances to the next pending queue item after deleting an event', async () => {
        render(
            <UpdateReviewClient
                queueId="queue-1"
                returnTo="/admin/ingestion/update-queue?page=2&pageSize=20&q=launch"
                initialData={{
                    queue: {
                        id: 'queue-1',
                        event_id: 'event-1',
                        source_event_id: 'source-1',
                        status: 'pending',
                        created_at: '2026-03-22T12:00:00.000Z',
                        event: {
                            id: 'event-1',
                            title: 'Current Event',
                            start_time: '2026-03-30T09:00:00.000Z',
                            organizer: {
                                id: 'org-1',
                                name: 'TechCal',
                            },
                        },
                    },
                    fields: [
                        {
                            id: 'field-1',
                            field_name: 'description',
                            old_value: 'Old',
                            new_value: 'New',
                            field_status: 'pending',
                        },
                    ],
                }}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: 'Delete Event' }));

        await waitFor(() => {
            expect(push).toHaveBeenCalledWith(
                '/admin/ingestion/update-queue/queue-2?returnTo=%2Fadmin%2Fingestion%2Fupdate-queue%3Fpage%3D2%26pageSize%3D20%26q%3Dlaunch'
            );
        });

        expect(showSuccess).toHaveBeenCalledWith('Event deleted successfully. Opening the next review item.');
    });
});
