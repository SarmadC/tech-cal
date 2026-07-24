import { NextRequest, NextResponse } from 'next/server';

import { isAdminUser } from '@/lib/adminAuth';
import { SpeakerPortraitCandidateService } from '@/services/speakerPortraitCandidateService';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';

async function getAdminContext() {
  const sessionClient = await createClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user || !(await isAdminUser(user.id, sessionClient))) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Service role credentials not configured');
  return { user, serviceClient: createServiceClient(url, key) };
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ speakerId: string }> }) {
  try {
    const context = await getAdminContext();
    if (!context) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    const { speakerId } = await params;
    return NextResponse.json({ candidates: await SpeakerPortraitCandidateService.list({ speakerId, supabaseClient: context.serviceClient }) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load portrait candidates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ speakerId: string }> }) {
  try {
    const context = await getAdminContext();
    if (!context) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    const { speakerId } = await params;
    const body = await request.json().catch(() => ({}));
    const sourcePageUrls = Array.isArray(body.sourcePageUrls) ? body.sourcePageUrls.filter((value: unknown): value is string => typeof value === 'string') : [];
    const { data: speaker, error } = await context.serviceClient.from('speakers').select('id, name, website_url').eq('id', speakerId).single();
    if (error || !speaker) return NextResponse.json({ error: 'Speaker not found' }, { status: 404 });
    const candidates = await SpeakerPortraitCandidateService.discover({
      speakerId,
      speakerName: speaker.name,
      sourcePageUrls: [...sourcePageUrls, speaker.website_url].filter((value): value is string => Boolean(value)),
      supabaseClient: context.serviceClient,
    });
    return NextResponse.json({ candidates });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to discover portrait candidates' }, { status: 500 });
  }
}
