/**
 * API Route: Event Edit History
 * 
 * GET: Get edit history for an event (which fields edited, when, by whom)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isAdminUser } from '@/lib/adminAuth';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ eventId: string }> }
) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check admin access
        const isAdmin = await isAdminUser(user.id, supabase);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { eventId } = await context.params;

        // Fetch all field edits for this event
        const client = supabase as unknown as {
            from: (table: string) => ReturnType<typeof supabase.from>;
        };

        const { data: edits, error } = await client
            .from('event_field_edits')
            .select(`
                *,
                editor:profiles(id, email, full_name)
            `)
            .eq('event_id', eventId)
            .order('edited_at', { ascending: false });

        if (error) {
            throw new Error(`Failed to fetch edit history: ${error.message}`);
        }

        return NextResponse.json({
            eventId,
            edits: edits || [],
            totalEdits: edits?.length || 0,
        });
    } catch (error) {
        console.error('Error fetching edit history:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}

