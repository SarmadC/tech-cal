/**
 * Admin: User-Submitted Events Review
 *
 * Lists community-submitted events for admin approval or rejection.
 */

export const dynamic = 'force-dynamic';

import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { isAdminUser } from '@/lib/adminAuth';
import { redirect } from 'next/navigation';
import SubmissionsClient from './SubmissionsClient';

export interface SubmissionItem {
    id: string;
    title: string;
    description: string | null;
    event_type: string;
    start_date: string;
    end_date: string | null;
    location: string | null;
    is_virtual: boolean;
    event_format: 'Online' | 'In-person' | 'Hybrid' | null;
    source_url: string | null;
    registration_url: string | null;
    registration_mode: 'external' | 'native';
    organizer_name: string | null;
    tags: string[];
    risk_flags: string[];
    validation_summary: {
        schema_version?: number;
        normalized_at?: string;
        duplicate_event_count?: number;
        repeated_submission_count?: number;
        warnings?: string[];
    } | null;
    submitted_payload: Record<string, unknown> | null;
    approved_payload: Record<string, unknown> | null;
    status: 'pending' | 'approved' | 'declined';
    admin_notes: string | null;
    reviewed_at: string | null;
    event_id: string | null;
    created_at: string;
    submitter: {
        id: string;
        email: string;
        raw_user_meta_data: { full_name?: string; name?: string } | null;
    } | null;
}

export default async function SubmissionsPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const isAdmin = await isAdminUser(user.id, supabase);
    if (!isAdmin) redirect('/dashboard');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase service credentials are required');
    }

    const serviceClient = createServiceClient(supabaseUrl, supabaseServiceKey);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tableClient = serviceClient as any;

    const { data, count } = await tableClient
        .from('user_submitted_events')
        .select(
            `
            id, title, description, event_type,
            start_date, end_date, location, is_virtual, event_format,
            source_url, registration_url, registration_mode, organizer_name, tags,
            risk_flags, validation_summary, submitted_payload, approved_payload,
            status, admin_notes, reviewed_at, event_id, created_at,
            submitter:user_id(id, email, raw_user_meta_data)
            `,
            { count: 'exact' }
        )
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .range(0, 19);

    return (
        <SubmissionsClient
            initialSubmissions={(data ?? []) as SubmissionItem[]}
            initialTotal={count ?? 0}
        />
    );
}
