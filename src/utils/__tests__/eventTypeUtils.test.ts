import {
  EVENT_TYPE_ALIASES,
  getEventTypeAliases,
  normalizeEventType,
  matchesPreferredType,
  calculateTypePreferenceScore,
} from '../eventTypeUtils';

describe('eventTypeUtils', () => {
  describe('getEventTypeAliases', () => {
    it('should return the EVENT_TYPE_ALIASES object', () => {
      const aliases = getEventTypeAliases();
      expect(aliases).toBe(EVENT_TYPE_ALIASES);
      expect(aliases).toHaveProperty('conference');
      expect(aliases).toHaveProperty('workshop');
      expect(aliases).toHaveProperty('meetup');
      expect(aliases).toHaveProperty('webinar');
    });
  });

  describe('normalizeEventType', () => {
    it('should return canonical type for direct match', () => {
      expect(normalizeEventType('conference')).toBe('conference');
      expect(normalizeEventType('workshop')).toBe('workshop');
      expect(normalizeEventType('meetup')).toBe('meetup');
      expect(normalizeEventType('webinar')).toBe('webinar');
    });

    it('should return canonical type for alias match', () => {
      expect(normalizeEventType('summit')).toBe('conference');
      expect(normalizeEventType('bootcamp')).toBe('workshop');
      expect(normalizeEventType('networking')).toBe('meetup');
      expect(normalizeEventType('online-event')).toBe('webinar');
    });

    it('should return canonical type for new aliases from audit', () => {
      expect(normalizeEventType('Trade Show')).toBe('conference');
      expect(normalizeEventType('trade show')).toBe('conference');
      expect(normalizeEventType('expo')).toBe('conference');
      expect(normalizeEventType('Product Launch')).toBe('conference');
      expect(normalizeEventType('product launch')).toBe('conference');
      expect(normalizeEventType('Hackathon')).toBe('workshop');
      expect(normalizeEventType('hackathon')).toBe('workshop');
    });

    it('should handle case-insensitive matching', () => {
      expect(normalizeEventType('Conference')).toBe('conference');
      expect(normalizeEventType('SUMMIT')).toBe('conference');
      expect(normalizeEventType('Workshop')).toBe('workshop');
      expect(normalizeEventType('BOOTCAMP')).toBe('workshop');
    });

    it('should handle hyphenated event types', () => {
      expect(normalizeEventType('executive-summit')).toBe('conference');
      expect(normalizeEventType('hands-on-workshop')).toBe('workshop');
      expect(normalizeEventType('networking-event')).toBe('meetup');
      expect(normalizeEventType('online-event')).toBe('webinar');
    });

    it('should return original value for unknown types', () => {
      expect(normalizeEventType('unknown-type')).toBe('unknown-type');
      expect(normalizeEventType('custom-event')).toBe('custom-event');
    });

    it('should trim whitespace', () => {
      expect(normalizeEventType('  conference  ')).toBe('conference');
      expect(normalizeEventType('  summit  ')).toBe('conference');
    });
  });

  describe('matchesPreferredType', () => {
    it('should return true for direct match', () => {
      expect(matchesPreferredType('conference', 'conference')).toBe(true);
      expect(matchesPreferredType('workshop', 'workshop')).toBe(true);
    });

    it('should return true for alias match', () => {
      expect(matchesPreferredType('summit', 'conference')).toBe(true);
      expect(matchesPreferredType('bootcamp', 'workshop')).toBe(true);
      expect(matchesPreferredType('networking', 'meetup')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(matchesPreferredType('Conference', 'conference')).toBe(true);
      expect(matchesPreferredType('SUMMIT', 'conference')).toBe(true);
      expect(matchesPreferredType('conference', 'CONFERENCE')).toBe(true);
    });

    it('should handle hyphenated types', () => {
      expect(matchesPreferredType('executive-summit', 'conference')).toBe(true);
      expect(matchesPreferredType('hands-on', 'workshop')).toBe(true);
    });

    it('should return false for non-matching types', () => {
      expect(matchesPreferredType('webinar', 'conference')).toBe(false);
      expect(matchesPreferredType('meetup', 'workshop')).toBe(false);
    });

    it('should trim whitespace', () => {
      expect(matchesPreferredType('  conference  ', '  conference  ')).toBe(true);
      expect(matchesPreferredType('  summit  ', '  conference  ')).toBe(true);
    });
  });

  describe('calculateTypePreferenceScore', () => {
    it('should return 100 for direct match', () => {
      expect(calculateTypePreferenceScore('conference', ['conference'])).toBe(100);
      expect(calculateTypePreferenceScore('workshop', ['workshop', 'conference'])).toBe(100);
    });

    it('should return 70 for alias match', () => {
      expect(calculateTypePreferenceScore('summit', ['conference'])).toBe(70);
      expect(calculateTypePreferenceScore('bootcamp', ['workshop'])).toBe(70);
      expect(calculateTypePreferenceScore('networking', ['meetup'])).toBe(70);
    });

    it('should return 50 for no match', () => {
      expect(calculateTypePreferenceScore('webinar', ['conference'])).toBe(50);
      expect(calculateTypePreferenceScore('meetup', ['workshop'])).toBe(50);
    });

    it('should be case-insensitive', () => {
      expect(calculateTypePreferenceScore('Conference', ['conference'])).toBe(100);
      expect(calculateTypePreferenceScore('SUMMIT', ['conference'])).toBe(70);
      expect(calculateTypePreferenceScore('workshop', ['WORKSHOP'])).toBe(100);
    });

    it('should handle hyphenated types', () => {
      expect(calculateTypePreferenceScore('executive-summit', ['conference'])).toBe(70);
      expect(calculateTypePreferenceScore('hands-on-workshop', ['workshop'])).toBe(70);
    });

    it('should return 50 for undefined event type', () => {
      expect(calculateTypePreferenceScore(undefined, ['conference'])).toBe(50);
    });

    it('should return 50 for empty preferred types array', () => {
      expect(calculateTypePreferenceScore('conference', [])).toBe(50);
    });

    it('should match against first matching preferred type', () => {
      const preferredTypes = ['workshop', 'conference'];
      expect(calculateTypePreferenceScore('summit', preferredTypes)).toBe(70); // Matches conference
      expect(calculateTypePreferenceScore('bootcamp', preferredTypes)).toBe(70); // Matches workshop
    });

    it('should handle whitespace in inputs', () => {
      expect(calculateTypePreferenceScore('  conference  ', ['  conference  '])).toBe(100);
      expect(calculateTypePreferenceScore('  summit  ', ['  conference  '])).toBe(70);
    });

    it('should score new aliases from audit correctly', () => {
      expect(calculateTypePreferenceScore('Trade Show', ['conference'])).toBe(70);
      expect(calculateTypePreferenceScore('trade show', ['conference'])).toBe(70);
      expect(calculateTypePreferenceScore('expo', ['conference'])).toBe(70);
      expect(calculateTypePreferenceScore('Product Launch', ['conference'])).toBe(70);
      expect(calculateTypePreferenceScore('Hackathon', ['workshop'])).toBe(70);
      expect(calculateTypePreferenceScore('hackathon', ['workshop'])).toBe(70);
    });
  });
});
