/**
 * Event Type Utilities
 *
 * Centralized utilities for event type matching, normalization, and aliases.
 * Used for event type preference scoring and UI hints.
 */

export const EVENT_TYPE_ALIASES: Record<string, string[]> = {
  'conference': ['summit', 'symposium', 'convention', 'executive-summit', 'trade show', 'expo', 'product launch'],
  'workshop': ['bootcamp', 'training', 'masterclass', 'hands-on', 'hands-on-workshop', 'hackathon'],
  'meetup': ['networking', 'community', 'local-event', 'networking-event'],
  'webinar': ['online-event', 'virtual-session', 'livestream', 'online']
};

/**
 * Get event type aliases mapping
 */
export function getEventTypeAliases(): typeof EVENT_TYPE_ALIASES {
  return EVENT_TYPE_ALIASES;
}

/**
 * Normalize an event type name to its canonical form
 *
 * @param typeName - The event type name to normalize
 * @returns The canonical type name, or the original if no match found
 *
 * @example
 * normalizeEventType('Summit') // returns 'conference'
 * normalizeEventType('hands-on-workshop') // returns 'workshop'
 * normalizeEventType('Conference') // returns 'conference'
 */
export function normalizeEventType(typeName: string): string {
  const normalized = typeName.toLowerCase().trim();

  // Check if it's already a canonical type
  if (EVENT_TYPE_ALIASES[normalized]) {
    return normalized;
  }

  // Check if it's an alias that should map to a canonical type
  for (const [canonical, aliases] of Object.entries(EVENT_TYPE_ALIASES)) {
    if (aliases.includes(normalized)) {
      return canonical;
    }
  }

  return normalized;
}

/**
 * Check if an event type matches a preferred type (including aliases)
 *
 * @param eventType - The actual event type from the event
 * @param preferredType - The user's preferred type
 * @returns true if direct match or alias match
 *
 * @example
 * matchesPreferredType('summit', 'conference') // returns true (alias match)
 * matchesPreferredType('conference', 'conference') // returns true (direct match)
 * matchesPreferredType('webinar', 'conference') // returns false
 */
export function matchesPreferredType(eventType: string, preferredType: string): boolean {
  const normalizedEvent = eventType.toLowerCase().trim();
  const normalizedPreferred = preferredType.toLowerCase().trim();

  // Direct match
  if (normalizedEvent === normalizedPreferred) {
    return true;
  }

  // Check if eventType is an alias of preferredType
  const aliases = EVENT_TYPE_ALIASES[normalizedPreferred] || [];
  return aliases.includes(normalizedEvent);
}

/**
 * Calculate event type preference score
 *
 * @param eventType - The actual event type from the event
 * @param preferredTypes - List of user's preferred event types
 * @returns Raw score: 100 (direct match), 70 (alias match), 50 (no match)
 */
export function calculateTypePreferenceScore(
  eventType: string | undefined,
  preferredTypes: string[]
): number {
  if (!eventType || preferredTypes.length === 0) {
    return 50; // Neutral score
  }

  const normalizedEvent = eventType.toLowerCase().trim();
  const normalizedPreferred = preferredTypes.map(t => t.toLowerCase().trim());

  // Check for direct match
  if (normalizedPreferred.includes(normalizedEvent)) {
    return 100;
  }

  // Check for alias match
  for (const preferred of normalizedPreferred) {
    const aliases = EVENT_TYPE_ALIASES[preferred] || [];
    if (aliases.includes(normalizedEvent)) {
      return 70;
    }
  }

  return 50; // No match
}
