import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import EventPreviewPanel from './EventPreviewPanel';

vi.mock('next/link', () => ({
    default: ({ children, href, scroll: _scroll, ...props }: { children: ReactNode; href?: string; scroll?: boolean }) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
}));

vi.mock('@/contexts/SnackbarContext', () => ({
    useSnackbar: () => ({
        showSuccess: vi.fn(),
        showError: vi.fn(),
    }),
}));

describe('EventPreviewPanel', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                fields: [
                    {
                        id: '2',
                        field_name: 'description',
                        field_status: 'pending',
                        old_value: 'Old description',
                        new_value: 'New description',
                    },
                    {
                        id: '1',
                        field_name: 'start_time',
                        field_status: 'pending',
                        old_value: '2026-03-30T09:00:00.000Z',
                        new_value: '2026-03-31T09:00:00.000Z',
                    },
                ],
            }),
            text: async () => '',
        }) as typeof fetch;
    });

    it('renders triage badges and prioritizes schedule fields in the preview list', async () => {
        render(
            <EventPreviewPanel
                item={{
                    id: 'queue-1',
                    event_id: 'event-1',
                    source_event_id: 'source-1',
                    status: 'pending',
                    requires_review_reason: 'Protected start time changed',
                    created_at: '2026-03-22T12:00:00.000Z',
                    signals: {
                        needsReview: true,
                        hasScheduleChange: true,
                        startsSoon: true,
                        isPastEvent: false,
                    },
                    changedFieldNames: ['start_time', 'description'],
                    event: {
                        id: 'event-1',
                        title: 'Launch Week',
                        start_time: '2026-03-31T09:00:00.000Z',
                        organizer: {
                            id: 'org-1',
                            name: 'TechCal',
                        },
                    },
                    fieldCounts: {
                        total: 2,
                        pending: 2,
                        approved: 0,
                        rejected: 0,
                    },
                }}
                returnTo="/admin/ingestion/update-queue?page=2"
                onClose={vi.fn()}
                onActionComplete={vi.fn()}
            />
        );

        expect(screen.getByText('Needs review')).toBeInTheDocument();
        expect(screen.getByText('Schedule change')).toBeInTheDocument();
        expect(screen.getByText('Starts soon')).toBeInTheDocument();
        expect(screen.getByText(/Protected start time changed/)).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('Start Time')).toBeInTheDocument();
            expect(screen.getByText('Description')).toBeInTheDocument();
        });

        const [startTimeField, descriptionField] = [screen.getAllByText('Start Time').at(-1), screen.getAllByText('Description').at(-1)];
        expect(startTimeField).toBeDefined();
        expect(descriptionField).toBeDefined();
        expect(
            Boolean(
                startTimeField &&
                    descriptionField &&
                    (startTimeField.compareDocumentPosition(descriptionField) & Node.DOCUMENT_POSITION_FOLLOWING)
            )
        ).toBe(true);
    });
});
