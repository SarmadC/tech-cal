/**
 * Admin Source Management API
 * 
 * Protected by admin authentication.
 * Manages ingestion sources: allowlist, blocklist, update trust scores.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isAdminUser, requireAdmin } from '@/lib/adminAuth';
import { IngestionSourceService } from '@/services/ingestion/IngestionSourceService';
import * as Sentry from '@sentry/nextjs';

export const runtime = 'nodejs';

/**
 * GET - List all sources with their status
 */
export async function GET(_request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const isAdmin = await isAdminUser(user.id, supabase);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const sources = await IngestionSourceService.getActiveSources(supabase);

        // Check blocklist/allowlist status
        const sourcesWithStatus = await Promise.all(
            sources.map(async (source) => {
                const [isBlocklisted, isAllowlisted] = await Promise.all([
                    IngestionSourceService.isBlocklisted(source.id, supabase),
                    IngestionSourceService.isAllowlisted(source.id, supabase),
                ]);

                return {
                    ...source,
                    isBlocklisted,
                    isAllowlisted,
                };
            })
        );

        return NextResponse.json({
            success: true,
            data: sourcesWithStatus,
        });
    } catch (error) {
        console.error('Error fetching sources:', error);
        Sentry.captureException(error, {
            extra: { function: 'GET_sources' },
        });

        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch sources' },
            { status: 500 }
        );
    }
}

/**
 * POST - Manage source allowlist/blocklist or update trust score
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await requireAdmin(user.id, supabase);

        const body = await request.json();
        const { action, sourceId, reason, trustScore, autoApproveThreshold } = body;

        if (!action || !sourceId) {
            return NextResponse.json(
                { error: 'Invalid request: action and sourceId required' },
                { status: 400 }
            );
        }

        if (action === 'blocklist') {
            // Add to blocklist
            const { error } = await supabase
                .from('source_blocklist')
                .insert({
                    source_id: sourceId,
                    reason: reason || 'Admin blocklisted',
                    blocked_by: user.id,
                });

            if (error) {
                throw error;
            }

            // Deactivate source
            await supabase
                .from('ingestion_sources')
                .update({ is_active: false })
                .eq('id', sourceId);

            return NextResponse.json({ success: true, message: 'Source blocklisted' });

        } else if (action === 'unblocklist') {
            // Remove from blocklist
            await supabase
                .from('source_blocklist')
                .delete()
                .eq('source_id', sourceId);

            // Reactivate source
            await supabase
                .from('ingestion_sources')
                .update({ is_active: true })
                .eq('id', sourceId);

            return NextResponse.json({ success: true, message: 'Source unblocklisted' });

        } else if (action === 'allowlist') {
            // Add to allowlist
            const { error } = await supabase
                .from('source_allowlist')
                .upsert({
                    source_id: sourceId,
                    auto_approve_threshold: autoApproveThreshold || 50.0,
                    reason: reason || 'Admin allowlisted',
                    allowed_by: user.id,
                }, {
                    onConflict: 'source_id',
                });

            if (error) {
                throw error;
            }

            return NextResponse.json({ success: true, message: 'Source allowlisted' });

        } else if (action === 'remove_allowlist') {
            // Remove from allowlist
            await supabase
                .from('source_allowlist')
                .delete()
                .eq('source_id', sourceId);

            return NextResponse.json({ success: true, message: 'Source removed from allowlist' });

        } else if (action === 'update_trust_score') {
            // Update trust score
            if (trustScore === undefined || trustScore < 0 || trustScore > 100) {
                return NextResponse.json(
                    { error: 'Invalid trust score (must be 0-100)' },
                    { status: 400 }
                );
            }

            await IngestionSourceService.updateTrustScore(sourceId, trustScore, supabase);

            return NextResponse.json({ success: true, message: 'Trust score updated' });

        } else {
            return NextResponse.json(
                { error: `Unknown action: ${action}` },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error('Error managing source:', error);
        Sentry.captureException(error, {
            extra: { function: 'POST_source_management' },
        });

        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to process action' },
            { status: 500 }
        );
    }
}


