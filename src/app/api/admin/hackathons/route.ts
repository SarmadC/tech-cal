/**
 * API Route: Admin Hackathons List
 *
 * GET: Fetch paginated hackathons with organizer info
 * POST: Create a new hackathon
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { isAdminUser } from '@/lib/adminAuth';
import {
    HACKATHON_FEATURE_VERSION,
    buildRecommendationFeatures,
    extractFeatureSignalsFromPayload,
    mergeStoredAndExtractedTags
} from '@/services/hackathonFeatureService';

async function getAuthenticatedAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: 'Unauthorized', status: 401, user: null, supabase: null };

    const isAdmin = await isAdminUser(user.id, supabase);
    if (!isAdmin) return { error: 'Forbidden', status: 403, user: null, supabase: null };

    return { error: null, status: 200, user, supabase };
}

function getServiceClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) return null;
    return createServiceClient(supabaseUrl, supabaseServiceKey);
}

export async function GET(request: NextRequest) {
    const { error, status } = await getAuthenticatedAdmin();
    if (error) return NextResponse.json({ error }, { status });

    const serviceClient = getServiceClient();
    if (!serviceClient) {
        return NextResponse.json({ error: 'Service role credentials not configured' }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));
    const search = searchParams.get('search')?.trim() || '';
    const sortBy = searchParams.get('sortBy') || 'start_date';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? true : false;

    const offset = (page - 1) * pageSize;

    let query = serviceClient
        .from('hackathons')
        .select(
            `
            id,
            title,
            status,
            start_date,
            end_date,
            location,
            is_virtual,
            organizer_id,
            created_at,
            updated_at,
            organizer:organizers(id, name, logo_url)
        `,
            { count: 'exact' }
        );

    if (search) {
        query = query.or(`title.ilike.%${search}%,location.ilike.%${search}%`);
    }

    const validSortFields = ['title', 'start_date', 'end_date', 'status', 'created_at'];
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'start_date';
    query = query.order(safeSortBy, { ascending: sortOrder });
    query = query.range(offset, offset + pageSize - 1);

    const { data, count, error: fetchError } = await query;

    if (fetchError) {
        console.error('Error fetching hackathons:', fetchError);
        return NextResponse.json({ error: 'Failed to fetch hackathons' }, { status: 500 });
    }

    return NextResponse.json({ hackathons: data || [], total: count || 0 });
}

async function resolveOrganizerId(
    serviceClient: ReturnType<typeof createServiceClient>,
    organizerId: string | null | undefined,
    organizerName: string | null | undefined,
    organizerWebsiteUrl: string | null | undefined
): Promise<string | null> {
    if (organizerId) return organizerId;
    if (!organizerName?.trim()) return null;

    // Find existing organizer by name (case-insensitive)
    const { data: existing } = await serviceClient
        .from('organizers')
        .select('id')
        .ilike('name', organizerName.trim())
        .limit(1)
        .single();

    if (existing?.id) return existing.id;

    // Create new organizer
    const { data: created } = await serviceClient
        .from('organizers')
        .insert({
            name: organizerName.trim(),
            website_url: organizerWebsiteUrl?.trim() || null,
        })
        .select('id')
        .single();

    return created?.id ?? null;
}

export async function POST(request: NextRequest) {
    const { error, status } = await getAuthenticatedAdmin();
    if (error) return NextResponse.json({ error }, { status });

    const serviceClient = getServiceClient();
    if (!serviceClient) {
        return NextResponse.json({ error: 'Service role credentials not configured' }, { status: 500 });
    }

    const body = await request.json();
    const {
        title,
        description,
        status: hackathonStatus,
        start_date,
        end_date,
        registration_deadline,
        submission_deadline,
        location,
        is_virtual,
        min_team_size,
        max_team_size,
        organizer_id,
        organizer_name,
        organizer_website_url,
        platform_url,
        registration_url,
        website_url,
        source_url,
        prize_pool,
        prize_description,
    } = body;

    if (!title || !start_date || !end_date) {
        return NextResponse.json(
            { error: 'title, start_date, and end_date are required' },
            { status: 400 }
        );
    }

    const resolvedOrganizerId = await resolveOrganizerId(serviceClient, organizer_id, organizer_name, organizer_website_url);
    const payloadSignals = extractFeatureSignalsFromPayload(body as Record<string, unknown>);
    const normalizedTags = mergeStoredAndExtractedTags([], title, description || null, payloadSignals.sourceTags);
    const recommendationFeatures = buildRecommendationFeatures({
        title,
        description: description || null,
        isVirtual: is_virtual ?? false,
        minTeamSize: min_team_size ?? payloadSignals.minTeamSize ?? null,
        maxTeamSize: max_team_size ?? payloadSignals.maxTeamSize ?? null,
        soloAllowed: payloadSignals.soloAllowed,
        prizePool: prize_pool || null,
        expectedParticipants: payloadSignals.expectedParticipants,
        durationHours: payloadSignals.durationHours,
        eligibilityText: payloadSignals.eligibilityText,
        tags: normalizedTags,
        tracks: payloadSignals.tracks,
        sponsors: payloadSignals.sponsors,
        requirements: payloadSignals.requirements,
        prizeCategories: payloadSignals.prizeCategories,
        providedApis: payloadSignals.providedApis,
    });

    const { data, error: insertError } = await serviceClient
        .from('hackathons')
        .insert({
            title,
            description: description || null,
            status: hackathonStatus || 'active',
            start_date,
            end_date,
            registration_deadline: registration_deadline || null,
            submission_deadline: submission_deadline || null,
            location: location || null,
            is_virtual: is_virtual ?? false,
            min_team_size: min_team_size ?? payloadSignals.minTeamSize ?? 1,
            max_team_size: max_team_size ?? payloadSignals.maxTeamSize ?? null,
            organizer_id: resolvedOrganizerId,
            platform_url: platform_url || null,
            registration_url: registration_url || null,
            website_url: website_url || null,
            source_url: source_url || null,
            prize_pool: prize_pool || null,
            prize_description: prize_description || null,
            tags: normalizedTags,
            recommendation_features: recommendationFeatures,
            feature_version: HACKATHON_FEATURE_VERSION,
        })
        .select()
        .single();

    if (insertError) {
        console.error('Error creating hackathon:', insertError);
        return NextResponse.json({ error: 'Failed to create hackathon' }, { status: 500 });
    }

    return NextResponse.json({ hackathon: data, organizer_id: resolvedOrganizerId }, { status: 201 });
}
