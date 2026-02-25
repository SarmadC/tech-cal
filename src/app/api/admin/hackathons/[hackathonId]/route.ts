/**
 * API Route: Admin Single Hackathon
 *
 * GET: Fetch a single hackathon with organizer data
 * PUT: Update hackathon fields
 * DELETE: Delete hackathon
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

interface ExistingHackathonForFeatures {
    title: string;
    description: string | null;
    is_virtual: boolean;
    min_team_size: number | null;
    max_team_size: number | null;
    prize_pool: string | null;
    tags?: string[] | null;
    recommendation_features?: Record<string, unknown> | null;
}

function readStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
}

async function getAuthenticatedAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: 'Unauthorized', status: 401 };

    const isAdmin = await isAdminUser(user.id, supabase);
    if (!isAdmin) return { error: 'Forbidden', status: 403 };

    return { error: null, status: 200 };
}

function getServiceClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) return null;
    return createServiceClient(supabaseUrl, supabaseServiceKey);
}

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ hackathonId: string }> }
) {
    const { error, status } = await getAuthenticatedAdmin();
    if (error) return NextResponse.json({ error }, { status });

    const serviceClient = getServiceClient();
    if (!serviceClient) {
        return NextResponse.json({ error: 'Service role credentials not configured' }, { status: 500 });
    }

    const { hackathonId } = await params;

    const { data, error: fetchError } = await serviceClient
        .from('hackathons')
        .select(`
            *,
            organizer:organizers(id, name, logo_url, website_url)
        `)
        .eq('id', hackathonId)
        .single();

    if (fetchError) {
        console.error('Error fetching hackathon:', fetchError);
        return NextResponse.json({ error: 'Hackathon not found' }, { status: 404 });
    }

    return NextResponse.json({ hackathon: data });
}

async function resolveOrganizerId(
    serviceClient: ReturnType<typeof createServiceClient>,
    organizerId: string | null | undefined,
    organizerName: string | null | undefined,
    organizerWebsiteUrl: string | null | undefined
): Promise<string | null> {
    if (organizerId) return organizerId;
    if (!organizerName?.trim()) return null;

    const { data: existing } = await serviceClient
        .from('organizers')
        .select('id')
        .ilike('name', organizerName.trim())
        .limit(1)
        .single();

    if (existing?.id) return existing.id;

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

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ hackathonId: string }> }
) {
    const { error, status } = await getAuthenticatedAdmin();
    if (error) return NextResponse.json({ error }, { status });

    const serviceClient = getServiceClient();
    if (!serviceClient) {
        return NextResponse.json({ error: 'Service role credentials not configured' }, { status: 500 });
    }

    const { hackathonId } = await params;
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

    const resolvedOrganizerId = await resolveOrganizerId(serviceClient, organizer_id, organizer_name, organizer_website_url);

    const { data: existingHackathonRaw, error: existingError } = await serviceClient
        .from('hackathons')
        .select('*')
        .eq('id', hackathonId)
        .single();

    if (existingError || !existingHackathonRaw) {
        console.error('Error fetching existing hackathon for feature update:', existingError);
        return NextResponse.json({ error: 'Hackathon not found' }, { status: 404 });
    }

    const existingHackathon = existingHackathonRaw as unknown as ExistingHackathonForFeatures;
    const payloadSignals = extractFeatureSignalsFromPayload(body as Record<string, unknown>);
    const existingFeatures = existingHackathon.recommendation_features || null;

    const effectiveTitle = title !== undefined ? title : existingHackathon.title;
    const effectiveDescription = description !== undefined ? (description || null) : existingHackathon.description;
    const effectiveIsVirtual = is_virtual !== undefined ? is_virtual : existingHackathon.is_virtual;
    const effectiveMinTeamSize = min_team_size !== undefined ? (min_team_size ?? null) : existingHackathon.min_team_size;
    const effectiveMaxTeamSize = max_team_size !== undefined ? (max_team_size ?? null) : existingHackathon.max_team_size;
    const effectivePrizePool = prize_pool !== undefined ? (prize_pool || null) : existingHackathon.prize_pool;
    const effectiveTags = mergeStoredAndExtractedTags(
        existingHackathon.tags || [],
        effectiveTitle,
        effectiveDescription,
        payloadSignals.sourceTags
    );

    const recommendationFeatures = buildRecommendationFeatures({
        title: effectiveTitle,
        description: effectiveDescription,
        isVirtual: effectiveIsVirtual,
        minTeamSize: effectiveMinTeamSize,
        maxTeamSize: effectiveMaxTeamSize,
        soloAllowed: payloadSignals.soloAllowed,
        prizePool: effectivePrizePool,
        expectedParticipants: payloadSignals.expectedParticipants
            ?? (typeof existingFeatures?.expectedParticipants === 'number' ? existingFeatures.expectedParticipants : null),
        durationHours: payloadSignals.durationHours
            ?? (typeof existingFeatures?.commitmentHours === 'number' ? existingFeatures.commitmentHours : null),
        eligibilityText: payloadSignals.eligibilityText
            ?? (typeof existingFeatures?.eligibilityText === 'string' ? existingFeatures.eligibilityText : null),
        tags: effectiveTags,
        tracks: payloadSignals.tracks.length > 0 ? payloadSignals.tracks : readStringArray(existingFeatures?.themes),
        sponsors: payloadSignals.sponsors.length > 0 ? payloadSignals.sponsors : readStringArray(existingFeatures?.sponsorDomains),
        requirements: payloadSignals.requirements.length > 0 ? payloadSignals.requirements : readStringArray(existingFeatures?.requiredTech),
        prizeCategories: payloadSignals.prizeCategories,
        providedApis: payloadSignals.providedApis,
    });

    const updatePayload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updatePayload.title = title;
    if (description !== undefined) updatePayload.description = description || null;
    if (hackathonStatus !== undefined) updatePayload.status = hackathonStatus;
    if (start_date !== undefined) updatePayload.start_date = start_date;
    if (end_date !== undefined) updatePayload.end_date = end_date;
    if (registration_deadline !== undefined) updatePayload.registration_deadline = registration_deadline || null;
    if (submission_deadline !== undefined) updatePayload.submission_deadline = submission_deadline || null;
    if (location !== undefined) updatePayload.location = location || null;
    if (is_virtual !== undefined) updatePayload.is_virtual = is_virtual;
    if (min_team_size !== undefined) updatePayload.min_team_size = min_team_size ?? null;
    if (max_team_size !== undefined) updatePayload.max_team_size = max_team_size ?? null;
    updatePayload.organizer_id = resolvedOrganizerId;
    if (platform_url !== undefined) updatePayload.platform_url = platform_url || null;
    if (registration_url !== undefined) updatePayload.registration_url = registration_url || null;
    if (website_url !== undefined) updatePayload.website_url = website_url || null;
    if (source_url !== undefined) updatePayload.source_url = source_url || null;
    if (prize_pool !== undefined) updatePayload.prize_pool = prize_pool || null;
    if (prize_description !== undefined) updatePayload.prize_description = prize_description || null;
    updatePayload.tags = effectiveTags;
    updatePayload.recommendation_features = recommendationFeatures;
    updatePayload.feature_version = HACKATHON_FEATURE_VERSION;

    const { data, error: updateError } = await serviceClient
        .from('hackathons')
        .update(updatePayload)
        .eq('id', hackathonId)
        .select()
        .single();

    if (updateError) {
        console.error('Error updating hackathon:', updateError);
        return NextResponse.json({ error: 'Failed to update hackathon' }, { status: 500 });
    }

    return NextResponse.json({ hackathon: data });
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ hackathonId: string }> }
) {
    const { error, status } = await getAuthenticatedAdmin();
    if (error) return NextResponse.json({ error }, { status });

    const serviceClient = getServiceClient();
    if (!serviceClient) {
        return NextResponse.json({ error: 'Service role credentials not configured' }, { status: 500 });
    }

    const { hackathonId } = await params;

    const { error: deleteError } = await serviceClient
        .from('hackathons')
        .delete()
        .eq('id', hackathonId);

    if (deleteError) {
        console.error('Error deleting hackathon:', deleteError);
        return NextResponse.json({ error: 'Failed to delete hackathon' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
