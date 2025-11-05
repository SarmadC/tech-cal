/**
 * API Route: Field Protection Configuration
 * 
 * GET: Fetch all field protection rules
 * PUT: Update protection mode for a field or bulk update
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isAdminUser } from '@/lib/adminAuth';

export async function GET(_request: NextRequest) {
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

        const client = supabase as unknown as {
            from: (table: string) => ReturnType<typeof supabase.from>;
        };

        // Fetch all field protection rules
        const { data: rules, error } = await client
            .from('event_field_protection_config')
            .select('*')
            .order('field_name', { ascending: true });

        if (error) {
            throw new Error(`Failed to fetch field protection rules: ${error.message}`);
        }

        return NextResponse.json({ rules: rules || [] });
    } catch (error) {
        console.error('Error fetching field protection rules:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const supabase = await createClient();
        const tableClient = supabase as unknown as {
            from: (table: string) => ReturnType<typeof supabase.from>;
        };
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check admin access
        const isAdmin = await isAdminUser(user.id, supabase);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { updates } = body as {
            updates: Array<{
                field_name: string;
                protection_mode: 'auto_update' | 'protected' | 'review_required';
            }>;
        };

        if (!updates || !Array.isArray(updates) || updates.length === 0) {
            return NextResponse.json(
                { error: 'Missing or invalid updates array' },
                { status: 400 }
            );
        }

        // Validate protection modes
        const validModes = ['auto_update', 'protected', 'review_required'];
        for (const update of updates) {
            if (!validModes.includes(update.protection_mode)) {
                return NextResponse.json(
                    { error: `Invalid protection_mode: ${update.protection_mode}` },
                    { status: 400 }
                );
            }
        }

        // Upsert each rule
        const results = [];
        for (const update of updates) {
            // Type definitions for ingestion admin tables are not generated; cast for upsert usage.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const protectionTable = tableClient.from('event_field_protection_config') as any;

            const { data, error } = await protectionTable
                .upsert({
                    field_name: update.field_name,
                    protection_mode: update.protection_mode,
                    updated_by: user.id,
                    updated_at: new Date().toISOString(),
                }, {
                    onConflict: 'field_name',
                })
                .select()
                .single();

            if (error) {
                throw new Error(`Failed to update field ${update.field_name}: ${error.message}`);
            }

            results.push(data);
        }

        return NextResponse.json({ success: true, updated: results });
    } catch (error) {
        console.error('Error updating field protection rules:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}

