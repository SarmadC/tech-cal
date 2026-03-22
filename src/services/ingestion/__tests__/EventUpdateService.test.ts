import { describe, expect, it } from 'vitest';

import { EventUpdateService } from '../EventUpdateService';

type QueueRow = {
    id: string;
    created_at: string;
    event_id: string;
    status: string;
    source_event_id: string | null;
    latest_source_event_id: string | null;
    merge_count: number;
    queue_type: string;
    requires_review_reason: string | null;
    reviewed_by: string | null;
    reviewed_at: string | null;
};

type QueueFieldRow = {
    id: string;
    created_at: string;
    queue_id: string;
    field_name: string;
    field_status: string;
    old_value: unknown;
    new_value: unknown;
    confidence: number | null;
    reviewed_by: string | null;
    reviewed_at: string | null;
};

class SelectBuilder<T extends Record<string, unknown>>
implements PromiseLike<{ data: T[]; error: null }> {
    private readonly filters: Array<(row: T) => boolean> = [];

    private orderBy: { field: keyof T & string; ascending: boolean } | null = null;

    private limitCount: number | null = null;

    constructor(private readonly getRows: () => T[]) {}

    eq(field: keyof T & string, value: unknown): this {
        this.filters.push((row) => row[field] === value);
        return this;
    }

    in(field: keyof T & string, values: unknown[]): this {
        this.filters.push((row) => values.includes(row[field]));
        return this;
    }

    order(field: keyof T & string, options: { ascending: boolean }): this {
        this.orderBy = { field, ascending: options.ascending };
        return this;
    }

    limit(value: number): this {
        this.limitCount = value;
        return this;
    }

    async maybeSingle(): Promise<{ data: T | null; error: null }> {
        const rows = this.run();
        return { data: rows[0] ?? null, error: null };
    }

    async single(): Promise<{ data: T | null; error: null }> {
        const rows = this.run();
        return { data: rows[0] ?? null, error: null };
    }

    then<TResult1 = { data: T[]; error: null }, TResult2 = never>(
        onfulfilled?:
            | ((value: { data: T[]; error: null }) => TResult1 | PromiseLike<TResult1>)
            | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ): PromiseLike<TResult1 | TResult2> {
        return Promise.resolve({ data: this.run(), error: null }).then(onfulfilled, onrejected);
    }

    private run(): T[] {
        let rows = [...this.getRows()];

        for (const filter of this.filters) {
            rows = rows.filter(filter);
        }

        if (this.orderBy) {
            const { field, ascending } = this.orderBy;
            rows.sort((left, right) => {
                const leftValue = left[field];
                const rightValue = right[field];
                if (leftValue === rightValue) {
                    return 0;
                }
                if (leftValue === undefined || leftValue === null) {
                    return 1;
                }
                if (rightValue === undefined || rightValue === null) {
                    return -1;
                }
                const direction = ascending ? 1 : -1;
                return String(leftValue).localeCompare(String(rightValue)) * direction;
            });
        }

        if (this.limitCount !== null) {
            rows = rows.slice(0, this.limitCount);
        }

        return rows;
    }
}

function createMockSupabase() {
    let queueCounter = 1;
    let fieldCounter = 1;
    const state: { queues: QueueRow[]; fields: QueueFieldRow[] } = {
        queues: [],
        fields: [],
    };

    const nextQueueId = () => `queue-${queueCounter++}`;
    const nextFieldId = () => `field-${fieldCounter++}`;

    const client = {
        from(table: string) {
            if (table === 'event_update_queue') {
                return {
                    select() {
                        return new SelectBuilder(() => state.queues);
                    },
                    insert(payload: Omit<QueueRow, 'id' | 'created_at'>) {
                        const row: QueueRow = {
                            id: nextQueueId(),
                            created_at: new Date(queueCounter * 1000).toISOString(),
                            event_id: payload.event_id,
                            status: payload.status,
                            source_event_id: payload.source_event_id,
                            latest_source_event_id: payload.latest_source_event_id,
                            merge_count: payload.merge_count,
                            queue_type: payload.queue_type,
                            requires_review_reason: payload.requires_review_reason,
                            reviewed_by: payload.reviewed_by ?? null,
                            reviewed_at: payload.reviewed_at ?? null,
                        };
                        state.queues.push(row);

                        return {
                            select() {
                                return {
                                    single: async () => ({ data: { id: row.id }, error: null }),
                                };
                            },
                        };
                    },
                    update(patch: Partial<QueueRow>) {
                        return {
                            eq: async (field: keyof QueueRow & string, value: unknown) => {
                                state.queues.forEach((row) => {
                                    if (row[field] === value) {
                                        Object.assign(row, patch);
                                    }
                                });
                                return { error: null };
                            },
                        };
                    },
                    delete() {
                        return {
                            eq: async (field: keyof QueueRow & string, value: unknown) => {
                                for (let index = state.queues.length - 1; index >= 0; index -= 1) {
                                    if (state.queues[index][field] === value) {
                                        state.queues.splice(index, 1);
                                    }
                                }
                                return { error: null };
                            },
                        };
                    },
                };
            }

            if (table === 'event_update_queue_fields') {
                return {
                    select() {
                        return new SelectBuilder(() => state.fields);
                    },
                    async insert(payload: Array<Omit<QueueFieldRow, 'id' | 'created_at'>> | Omit<QueueFieldRow, 'id' | 'created_at'>) {
                        const rows = Array.isArray(payload) ? payload : [payload];
                        rows.forEach((row) => {
                            state.fields.push({
                                id: nextFieldId(),
                                created_at: new Date(fieldCounter * 1000).toISOString(),
                                queue_id: row.queue_id,
                                field_name: row.field_name,
                                field_status: row.field_status,
                                old_value: row.old_value,
                                new_value: row.new_value,
                                confidence: row.confidence,
                                reviewed_by: row.reviewed_by ?? null,
                                reviewed_at: row.reviewed_at ?? null,
                            });
                        });
                        return { error: null };
                    },
                    async upsert(rows: Array<Omit<QueueFieldRow, 'id' | 'created_at'>>, _options: { onConflict: string }) {
                        rows.forEach((row) => {
                            const existing = state.fields.find(
                                (field) =>
                                    field.queue_id === row.queue_id
                                    && field.field_name === row.field_name
                            );

                            if (existing) {
                                Object.assign(existing, {
                                    old_value: row.old_value,
                                    new_value: row.new_value,
                                    field_status: row.field_status,
                                    confidence: row.confidence,
                                    reviewed_by: row.reviewed_by ?? null,
                                    reviewed_at: row.reviewed_at ?? null,
                                });
                            } else {
                                state.fields.push({
                                    id: nextFieldId(),
                                    created_at: new Date(fieldCounter * 1000).toISOString(),
                                    queue_id: row.queue_id,
                                    field_name: row.field_name,
                                    field_status: row.field_status,
                                    old_value: row.old_value,
                                    new_value: row.new_value,
                                    confidence: row.confidence,
                                    reviewed_by: row.reviewed_by ?? null,
                                    reviewed_at: row.reviewed_at ?? null,
                                });
                            }
                        });

                        return { error: null };
                    },
                    update(patch: Partial<QueueFieldRow>) {
                        return {
                            eq: async (field: keyof QueueFieldRow & string, value: unknown) => {
                                state.fields.forEach((row) => {
                                    if (row[field] === value) {
                                        Object.assign(row, patch);
                                    }
                                });
                                return { error: null };
                            },
                        };
                    },
                    delete() {
                        return {
                            eq: async (field: keyof QueueFieldRow & string, value: unknown) => {
                                for (let index = state.fields.length - 1; index >= 0; index -= 1) {
                                    if (state.fields[index][field] === value) {
                                        state.fields.splice(index, 1);
                                    }
                                }
                                return { error: null };
                            },
                        };
                    },
                };
            }

            throw new Error(`Unexpected table: ${table}`);
        },
    };

    return {
        client,
        state,
    };
}

describe('EventUpdateService.queueForReview', () => {
    it('merges repeated ingestion diffs into one open queue item', async () => {
        const { client, state } = createMockSupabase();

        await EventUpdateService.queueForReview(
            'event-1',
            'source-1',
            [
                {
                    fieldName: 'title',
                    oldValue: 'Old title',
                    newValue: 'New title',
                    hasChanged: true,
                },
            ],
            client as never
        );

        await EventUpdateService.queueForReview(
            'event-1',
            'source-2',
            [
                {
                    fieldName: 'title',
                    oldValue: 'Old title',
                    newValue: 'Newest title',
                    hasChanged: true,
                },
            ],
            client as never
        );

        expect(state.queues).toHaveLength(1);
        expect(state.queues[0]).toMatchObject({
            event_id: 'event-1',
            source_event_id: 'source-1',
            latest_source_event_id: 'source-2',
            merge_count: 1,
            queue_type: 'ingestion_update',
            status: 'pending',
            requires_review_reason: 'Fields require review: title',
        });

        expect(state.fields).toHaveLength(1);
        expect(state.fields[0]).toMatchObject({
            queue_id: state.queues[0].id,
            field_name: 'title',
            field_status: 'pending',
            new_value: 'Newest title',
        });
    });

    it('keeps approved fields intact while merging new pending fields into a partially approved queue', async () => {
        const { client, state } = createMockSupabase();

        await EventUpdateService.queueForReview(
            'event-1',
            'source-1',
            [
                {
                    fieldName: 'title',
                    oldValue: 'Old title',
                    newValue: 'Initial title',
                    hasChanged: true,
                },
            ],
            client as never
        );

        state.queues[0].status = 'partially_approved';
        state.fields[0].field_status = 'approved';
        state.fields[0].reviewed_by = 'reviewer-1';
        state.fields[0].reviewed_at = '2026-03-22T12:00:00.000Z';

        await EventUpdateService.queueForReview(
            'event-1',
            'source-2',
            [
                {
                    fieldName: 'title',
                    oldValue: 'Old title',
                    newValue: 'Should stay ignored',
                    hasChanged: true,
                },
                {
                    fieldName: 'location',
                    oldValue: 'Online',
                    newValue: 'San Francisco',
                    hasChanged: true,
                },
            ],
            client as never
        );

        const titleField = state.fields.find((field) => field.field_name === 'title');
        const locationField = state.fields.find((field) => field.field_name === 'location');

        expect(state.queues).toHaveLength(1);
        expect(state.queues[0]).toMatchObject({
            status: 'partially_approved',
            latest_source_event_id: 'source-2',
            merge_count: 1,
            requires_review_reason: 'Fields require review: location',
        });

        expect(titleField).toMatchObject({
            field_status: 'approved',
            new_value: 'Initial title',
            reviewed_by: 'reviewer-1',
        });
        expect(locationField).toMatchObject({
            field_status: 'pending',
            new_value: 'San Francisco',
        });
    });
});
