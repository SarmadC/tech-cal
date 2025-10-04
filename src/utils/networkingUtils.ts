/**
 * Networking Utilities
 *
 * Utilities for detecting senior speakers and analyzing networking potential.
 * Used for networking goals scoring in career impact calculations.
 */

/**
 * Regular expressions for detecting senior-level titles
 * Includes C-suite, VP/Director level, technical leadership, and founders
 */
export const SENIOR_TITLE_PATTERNS = [
  // C-Suite (comprehensive list)
  /\b(ceo|cto|cfo|coo|cio|cpo|cmo|chief)\b/i,

  // VP and Director level
  /\b(vp|vice president|director|head of|head\s+of)\b/i,

  // Technical leadership
  /\b(principal|fellow|distinguished|staff\s+engineer)\b/i,

  // Founders and partners
  /\b(founder|co-founder|cofounder|partner)\b/i,
];

/**
 * Check if a speaker has a senior-level title
 *
 * @param speaker - Speaker object with optional title
 * @returns true if the speaker has a senior title
 *
 * @example
 * isSeniorSpeaker({ title: 'CEO at TechCorp' }) // returns true
 * isSeniorSpeaker({ title: 'VP of Engineering' }) // returns true
 * isSeniorSpeaker({ title: 'Junior Developer' }) // returns false
 * isSeniorSpeaker({ title: undefined }) // returns false
 */
export function isSeniorSpeaker(speaker: { title?: string }): boolean {
  if (!speaker.title) {
    return false;
  }

  const title = speaker.title.toLowerCase();
  return SENIOR_TITLE_PATTERNS.some(pattern => pattern.test(title));
}

/**
 * Check if any speaker in a list has a senior-level title
 *
 * @param speakers - Array of speaker objects
 * @returns true if at least one speaker has a senior title
 *
 * @example
 * hasSeniorSpeaker([{ title: 'CEO' }, { title: 'Developer' }]) // returns true
 * hasSeniorSpeaker([{ title: 'Developer' }]) // returns false
 * hasSeniorSpeaker([]) // returns false
 */
export function hasSeniorSpeaker(speakers: Array<{ title?: string }>): boolean {
  if (!speakers || speakers.length === 0) {
    return false;
  }

  return speakers.some(isSeniorSpeaker);
}

/**
 * Count the number of senior speakers in a list
 *
 * @param speakers - Array of speaker objects
 * @returns Number of speakers with senior titles
 */
export function countSeniorSpeakers(speakers: Array<{ title?: string }>): number {
  if (!speakers || speakers.length === 0) {
    return 0;
  }

  return speakers.filter(isSeniorSpeaker).length;
}

/**
 * Get the seniority level of speakers for an event
 *
 * @param speakers - Array of speaker objects
 * @returns 'high' if 50%+ are senior, 'medium' if 1-49%, 'low' if none
 */
export function getSpeakerSeniorityLevel(
  speakers: Array<{ title?: string }>
): 'high' | 'medium' | 'low' {
  if (!speakers || speakers.length === 0) {
    return 'low';
  }

  const seniorCount = countSeniorSpeakers(speakers);
  const seniorPercentage = seniorCount / speakers.length;

  if (seniorPercentage >= 0.5) {
    return 'high';
  } else if (seniorCount > 0) {
    return 'medium';
  } else {
    return 'low';
  }
}
