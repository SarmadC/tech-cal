import { NextRequest, NextResponse } from 'next/server';

import { isAdminUser } from '@/lib/adminAuth';
import { SpeakerPortraitCandidateService } from '@/services/speakerPortraitCandidateService';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';

export async function POST(request: NextRequest, { params }: { params: Promise<{ candidateId: string }> }) {
  try {
    const sessionClient = await createClient();
    const { data: { user } } = await sessionClient.auth.getUser();
    if (!user || !(await isAdminUser(user.id, sessionClient))) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    const body = await request.json().catch(() => ({}));
    if (body.action !== 'approve' && body.action !== 'reject') return NextResponse.json({ error: 'Invalid review action' }, { status: 400 });
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return NextResponse.json({ error: 'Service role credentials not configured' }, { status: 500 });
    const { candidateId } = await params;
    await SpeakerPortraitCandidateService.review({ candidateId, action: body.action, reviewerId: user.id, supabaseClient: createServiceClient(url, key) });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to review portrait candidate' }, { status: 500 });
  }
}
