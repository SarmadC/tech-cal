/**
 * Update Queue Item Detail Page
 * 
 * Admin-only page for reviewing individual update queue items with field-by-field diffs
 */

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { isAdminUser } from '@/lib/adminAuth';
import UpdateReviewClient from './UpdateReviewClient';

export const dynamic = 'force-dynamic';

interface QueueFieldRow {
    field_name: string;
    old_value: unknown;
    new_value: unknown;
}

type UpdateReviewInitialData = NonNullable<Parameters<typeof UpdateReviewClient>[0]['initialData']>;

export default async function UpdateReviewPage({ 
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const isAdmin = await isAdminUser(user.id, supabase);
    if (!isAdmin) {
        redirect('/');
    }

    const queueId = id;

    // Fetch queue item with all field diffs directly from Supabase
    const client = supabase as unknown as {
        from: (table: string) => ReturnType<typeof supabase.from>;
    };

    const { data: queueItem, error: queueError } = await client
        .from('event_update_queue')
        .select(`
            *,
            event:events(id, title, start_time, description, organizer:organizers(id, name))
        `)
        .eq('id', queueId)
        .single();

    if (queueError || !queueItem) {
        // Let client component handle the error state
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <div className="flex items-center gap-4 mb-4">
                        <Link
                            href="/admin/ingestion/update-queue"
                            className="text-blue-600 hover:text-blue-800"
                        >
                            ← Back to Queue
                        </Link>
                    </div>
                    <h1 className="text-3xl font-bold mb-2">Review Update</h1>
                    <p className="text-gray-600">
                        Review and approve field-level changes for this event update
                    </p>
                </div>

                <UpdateReviewClient queueId={queueId} initialData={null} />
            </div>
        );
    }

    // Fetch field-level changes
    const { data: fields } = await client
        .from('event_update_queue_fields')
        .select('*')
        .eq('queue_id', queueId)
        .order('field_name');

    // Enhance tag fields with tag names (if old/new values are tag IDs)
    const typedFields = (fields || []) as unknown as QueueFieldRow[];

    const enhancedFields = await Promise.all(typedFields.map(async (field) => {
        if (field.field_name === 'tags') {
            // Fetch tag names for old value (array of IDs)
            const oldTagIds = Array.isArray(field.old_value) ? field.old_value : [];
            const newTagNames = Array.isArray(field.new_value) ? field.new_value : [];

            if (oldTagIds.length > 0 && typeof oldTagIds[0] === 'string' && oldTagIds[0].includes('-')) {
                // Looks like UUIDs - fetch tag names
                const { data: oldTags } = await client
                    .from('event_tags')
                    .select('id, event_tag')
                    .in('id', oldTagIds as string[]);

                const tagRows = Array.isArray(oldTags)
                    ? (oldTags as Array<{ event_tag?: string; id?: string }>)
                    : [];

                const oldTagNames = tagRows.length > 0
                    ? tagRows.map(tag => tag.event_tag ?? tag.id ?? '').filter(Boolean)
                    : oldTagIds;
                return {
                    ...field,
                    old_value: oldTagNames,
                    new_value: newTagNames,
                };
            }
        }
        return field;
    }));

    const queueData: UpdateReviewInitialData = {
        queue: queueItem as unknown as UpdateReviewInitialData['queue'],
        fields: enhancedFields as UpdateReviewInitialData['fields'],
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <div className="flex items-center gap-4 mb-4">
                    <Link
                        href="/admin/ingestion/update-queue"
                        className="text-blue-600 hover:text-blue-800"
                    >
                        ← Back to Queue
                    </Link>
                </div>
                <h1 className="text-3xl font-bold mb-2">Review Update</h1>
                <p className="text-gray-600">
                    Review and approve field-level changes for this event update
                </p>
            </div>

            <UpdateReviewClient queueId={queueId} initialData={queueData} />
        </div>
    );
}

