'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import type { Speaker } from '../types';

type Candidate = {
  id: string;
  imageUrl: string;
  sourcePageUrl: string;
  width: number;
  height: number;
  status: 'pending' | 'approved' | 'rejected';
};

export function SpeakerPortraitReview({ speaker, sourcePageUrl }: { speaker: Speaker; sourcePageUrl?: string | null }) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!speaker.id) return null;

  const request = async (method: 'GET' | 'POST', body?: unknown) => {
    const response = await fetch(`/api/admin/speaker-portraits/${speaker.id}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? 'Portrait request failed');
    setCandidates(payload.candidates ?? []);
  };

  const discover = async () => {
    setLoading(true); setError(null);
    try { await request('POST', { sourcePageUrls: sourcePageUrl ? [sourcePageUrl] : [] }); }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Unable to find portrait candidates'); }
    finally { setLoading(false); }
  };

  const review = async (candidateId: string, action: 'approve' | 'reject') => {
    setLoading(true); setError(null);
    try {
      const response = await fetch(`/api/admin/speaker-portraits/candidates/${candidateId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Unable to review portrait');
      await request('GET');
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Unable to review portrait'); }
    finally { setLoading(false); }
  };

  return <div className="border-t border-default pt-3 space-y-3">
    <div className="flex items-center justify-between gap-3">
      <div><p className="text-xs font-medium text-foreground-primary">Hero portrait candidates</p><p className="text-xs text-foreground-muted">Official-source images only; approval publishes the portrait.</p></div>
      <Button type="button" size="sm" variant="secondary" disabled={loading} onClick={discover}>{loading ? 'Searching…' : 'Find official portraits'}</Button>
    </div>
    {error ? <p className="text-xs text-rose-400">{error}</p> : null}
    {candidates.map((candidate) => <div className="flex gap-3 border border-default p-2" key={candidate.id}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt="" className="h-16 w-16 object-cover bg-background-secondary" src={candidate.imageUrl} />
      <div className="min-w-0 flex-1"><p className="text-xs text-foreground-primary">{candidate.width} × {candidate.height}</p><p className="truncate text-xs text-foreground-muted">{candidate.sourcePageUrl}</p><p className="text-xs text-foreground-tertiary">{candidate.status}</p></div>
      {candidate.status === 'pending' ? <div className="flex items-center gap-1"><Button type="button" size="sm" disabled={loading} onClick={() => review(candidate.id, 'approve')}>Approve</Button><Button type="button" size="sm" variant="ghost" disabled={loading} onClick={() => review(candidate.id, 'reject')}>Reject</Button></div> : null}
    </div>)}
  </div>;
}
