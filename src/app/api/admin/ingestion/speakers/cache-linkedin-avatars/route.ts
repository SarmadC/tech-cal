import { NextRequest, NextResponse } from 'next/server';

import { isAdminUser } from '@/lib/adminAuth';
import { SpeakerAvatarCacheService } from '@/services/speakerAvatarCacheService';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const sessionClient = await createClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isAdminUser(user.id, sessionClient);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Service role credentials not configured' },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const rawLimit = typeof body.limit === 'number' ? body.limit : Number(body.limit);
    const rawScanBatchSize =
      typeof body.scanBatchSize === 'number'
        ? body.scanBatchSize
        : Number(body.scanBatchSize);
    const rawConcurrency =
      typeof body.concurrency === 'number'
        ? body.concurrency
        : Number(body.concurrency);

    const limit = Number.isFinite(rawLimit)
      ? Math.max(1, Math.min(500, Math.floor(rawLimit)))
      : 100;
    const scanBatchSize = Number.isFinite(rawScanBatchSize)
      ? Math.max(limit, Math.min(1_000, Math.floor(rawScanBatchSize)))
      : 200;
    const concurrency = Number.isFinite(rawConcurrency)
      ? Math.max(1, Math.min(10, Math.floor(rawConcurrency)))
      : 5;
    const dryRun = body.dryRun === true;
    const forceRefresh = body.forceRefresh === true;

    const serviceClient = createServiceClient(supabaseUrl, supabaseServiceKey);
    const summary = await SpeakerAvatarCacheService.backfillLinkedInSpeakerAvatars({
      supabaseClient: serviceClient,
      limit,
      scanBatchSize,
      concurrency,
      dryRun,
      forceRefresh,
    });

    return NextResponse.json({
      success: true,
      summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
