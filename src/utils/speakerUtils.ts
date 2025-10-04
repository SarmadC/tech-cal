/**
 * Speaker utilities
 */

export interface SimpleSpeaker {
  title?: string | null;
  company?: string | null;
}

/**
 * Detects if an event has at least one senior/C-level speaker.
 * - Case-insensitive
 * - Matches common senior and C-level titles
 */
export function hasSeniorSpeaker(speakers: Array<SimpleSpeaker | undefined> | undefined): boolean {
  if (!speakers || speakers.length === 0) return false;

  const seniorRegex = /(\bchief\b|\bceo\b|\bcto\b|\bcfo\b|\bcoo\b|\bcio\b|\bcpo\b|\bvp\b|\bvice president\b|\bdirector\b|\bhead of\b|\bprincipal\b|\bfellow\b|\bexecutive\b)/i;

  return speakers.some(sp => {
    const title = (sp?.title || '').toString();
    return seniorRegex.test(title);
  });
}


