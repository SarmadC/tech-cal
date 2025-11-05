/**
 * Field Protection Configuration Page
 * 
 * Admin-only page for configuring field protection modes
 */

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { isAdminUser } from '@/lib/adminAuth';
import FieldProtectionClient from './FieldProtectionClient';

interface ProtectionConfigRule {
    id: string;
    field_name: string;
    protection_mode: 'auto_update' | 'protected' | 'review_required';
    default_mode: 'auto_update' | 'protected' | 'review_required' | null;
    updated_at: string;
    updated_by: string | null;
}

export const dynamic = 'force-dynamic';

export default async function FieldProtectionPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const isAdmin = await isAdminUser(user.id, supabase);
    if (!isAdmin) {
        redirect('/');
    }

    // Fetch current protection rules
    let rules: ProtectionConfigRule[] = [];
    let errorMessage: string | null = null;

    try {
        const client = supabase as unknown as {
            from: (table: string) => ReturnType<typeof supabase.from>;
        };

        const { data, error } = await client
            .from('event_field_protection_config')
            .select('*')
            .order('field_name', { ascending: true });

        if (error) {
            console.error('Error fetching field protection rules:', error);
            errorMessage = error.message || 'Failed to fetch protection rules';
            
            // Check if table doesn't exist
            if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
                errorMessage = 'Database table not found. Please run migration: 20250101000011_add_field_protection_config.sql';
            }
        } else {
            rules = ((data || []) as unknown) as ProtectionConfigRule[];
        }
    } catch (err) {
        console.error('Unexpected error fetching field protection rules:', err);
        errorMessage = err instanceof Error ? err.message : 'Unexpected error occurred';
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Field Protection Configuration</h1>
                <p className="text-gray-600">
                    Configure which fields auto-update, require review, or are protected when events are re-ingested
                </p>
            </div>

            {errorMessage ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
                    <p className="text-red-700">{errorMessage}</p>
                    <p className="text-sm text-red-600 mt-4">
                        If the table does not exist, please run the migration: <code className="bg-red-100 px-2 py-1 rounded">20250101000011_add_field_protection_config.sql</code>
                    </p>
                </div>
            ) : (
                <FieldProtectionClient initialRules={rules} />
            )}
        </div>
    );
}

