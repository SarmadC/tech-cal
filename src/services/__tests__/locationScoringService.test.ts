import { describe, it, expect } from 'vitest';
import {
  LocationScoringService,
  UserLocation,
  EventLocationData,
} from '../locationScoringService';
import type { Event } from '@/types';

describe('LocationScoringService', () => {
  describe('calculateLocationScore', () => {
    it('returns score 1.0 for online events', () => {
      const event: EventLocationData = { eventFormat: 'Online' };
      const result = LocationScoringService.calculateLocationScore(event, null);
      expect(result.score).toBe(1.0);
      expect(result.isVirtual).toBe(true);
      expect(result.reason).toContain('Online');
    });

    it('returns score 1.0 for hybrid events', () => {
      const event: EventLocationData = { eventFormat: 'Hybrid' };
      const result = LocationScoringService.calculateLocationScore(event, null);
      expect(result.score).toBe(1.0);
      expect(result.isVirtual).toBe(true);
    });

    it('returns score 1.0 for events with livestream URL', () => {
      const event: EventLocationData = {
        eventFormat: 'In-person',
        livestreamUrl: 'https://youtube.com/live/abc',
      };
      const result = LocationScoringService.calculateLocationScore(event, null);
      expect(result.score).toBe(1.0);
      expect(result.isVirtual).toBe(true);
    });

    it('returns 0.8 when no user location provided for in-person event', () => {
      const event: EventLocationData = {
        eventFormat: 'In-person',
        location: 'San Francisco, USA',
      };
      const result = LocationScoringService.calculateLocationScore(event, null);
      expect(result.score).toBe(0.8);
      expect(result.isVirtual).toBe(false);
      expect(result.reason).toBe('Location not available');
    });

    it('returns 0.8 when event has no location info', () => {
      const event: EventLocationData = { eventFormat: 'In-person' };
      const user: UserLocation = { city: 'New York', country: 'usa' };
      const result = LocationScoringService.calculateLocationScore(event, user);
      expect(result.score).toBe(0.8);
      expect(result.reason).toBe('Event location not specified');
    });

    it('returns 1.0 when event is in the same city (via venueCity)', () => {
      const event: EventLocationData = {
        eventFormat: 'In-person',
        venueCity: 'San Francisco',
        venueCountry: 'USA',
      };
      const user: UserLocation = { city: 'San Francisco', country: 'usa' };
      const result = LocationScoringService.calculateLocationScore(event, user);
      expect(result.score).toBe(1.0);
      expect(result.reason).toContain('In your city');
    });

    it('returns 1.0 when event location string contains user city', () => {
      const event: EventLocationData = {
        eventFormat: 'In-person',
        location: 'Convention Center, Austin, TX',
      };
      const user: UserLocation = { city: 'Austin', country: 'usa' };
      const result = LocationScoringService.calculateLocationScore(event, user);
      expect(result.score).toBe(1.0);
      expect(result.reason).toContain('In your city');
    });

    it('returns 0.85 for same country match (via venueCountry)', () => {
      const event: EventLocationData = {
        eventFormat: 'In-person',
        venueCity: 'Chicago',
        venueCountry: 'usa',
      };
      const user: UserLocation = { city: 'Boston', country: 'usa' };
      const result = LocationScoringService.calculateLocationScore(event, user);
      expect(result.score).toBe(0.85);
      expect(result.reason).toContain('In your country');
    });

    it('returns 0.85 for same country via location string with variation', () => {
      const event: EventLocationData = {
        eventFormat: 'In-person',
        location: 'Seattle, United States',
      };
      const user: UserLocation = { city: 'Miami', country: 'usa' };
      const result = LocationScoringService.calculateLocationScore(event, user);
      expect(result.score).toBe(0.85);
      expect(result.reason).toContain('In your country');
    });

    it('returns 0.7 for same continent', () => {
      const event: EventLocationData = {
        eventFormat: 'In-person',
        venueCity: 'Toronto',
        venueCountry: 'canada',
      };
      const user: UserLocation = { city: 'New York', country: 'usa' };
      const result = LocationScoringService.calculateLocationScore(event, user);
      expect(result.score).toBe(0.7);
      expect(result.reason).toBe('In your region');
    });

    it('returns 0.5 for different continent', () => {
      const event: EventLocationData = {
        eventFormat: 'In-person',
        venueCity: 'Tokyo',
        venueCountry: 'japan',
      };
      const user: UserLocation = { city: 'Berlin', country: 'germany' };
      const result = LocationScoringService.calculateLocationScore(event, user);
      expect(result.score).toBe(0.5);
      expect(result.reason).toBe('International event');
    });

    it('uses timezone to infer continent when country is unavailable', () => {
      const event: EventLocationData = {
        eventFormat: 'In-person',
        location: 'some venue in berlin, germany',
      };
      const user: UserLocation = { timezone: 'Europe/London' };
      const result = LocationScoringService.calculateLocationScore(event, user);
      expect(result.score).toBe(0.7);
      expect(result.reason).toBe('In your region');
    });

    it('detects continent from city hints in location string', () => {
      const event: EventLocationData = {
        eventFormat: 'In-person',
        location: 'Moscone Center, San Francisco',
      };
      const user: UserLocation = { city: 'Seattle', country: 'usa' };
      // san francisco is in north_america, user country usa is north_america
      // but city doesn't match -> falls to country check -> 'usa' not in location string
      // then continent check -> both north_america -> 0.7
      const result = LocationScoringService.calculateLocationScore(event, user);
      expect(result.score).toBe(0.7);
    });
  });

  describe('isVirtualEvent', () => {
    it('detects Online format', () => {
      expect(LocationScoringService.isVirtualEvent({ eventFormat: 'Online' })).toBe(true);
    });

    it('detects Hybrid format', () => {
      expect(LocationScoringService.isVirtualEvent({ eventFormat: 'Hybrid' })).toBe(true);
    });

    it('returns false for In-person without livestream', () => {
      expect(
        LocationScoringService.isVirtualEvent({ eventFormat: 'In-person', location: 'NYC' })
      ).toBe(false);
    });

    it('detects livestream URL', () => {
      expect(
        LocationScoringService.isVirtualEvent({
          eventFormat: 'In-person',
          livestreamUrl: 'https://stream.example.com',
        })
      ).toBe(true);
    });

    it('detects virtual keywords in location string', () => {
      const virtualLocations = ['Virtual Event', 'Online webinar', 'Remote meetup', 'Zoom call'];
      for (const loc of virtualLocations) {
        expect(
          LocationScoringService.isVirtualEvent({ location: loc })
        ).toBe(true);
      }
    });

    it('returns false for non-virtual location strings', () => {
      expect(
        LocationScoringService.isVirtualEvent({ location: 'San Francisco Convention Center' })
      ).toBe(false);
    });
  });

  describe('calculateBatchLocationScores', () => {
    it('returns scores keyed by event id', () => {
      const events = [
        { id: 'e1', eventFormat: 'Online' as const, location: '', title: '', description: '', organizer: '', status: '', startTime: '', endTime: null, sourceUrl: '', livestreamUrl: null, eventTypeId: '', createdAt: '' },
        { id: 'e2', eventFormat: 'In-person' as const, location: 'Berlin, Germany', title: '', description: '', organizer: '', status: '', startTime: '', endTime: null, sourceUrl: '', livestreamUrl: null, eventTypeId: '', createdAt: '' },
      ];
      const user: UserLocation = { city: 'Berlin', country: 'germany' };
      const results = LocationScoringService.calculateBatchLocationScores(events as unknown as Event[], user);

      expect(results.size).toBe(2);
      expect(results.get('e1')!.score).toBe(1.0);
      expect(results.get('e2')!.score).toBe(1.0); // same city
    });

    it('handles empty events array', () => {
      const results = LocationScoringService.calculateBatchLocationScores([], null);
      expect(results.size).toBe(0);
    });
  });
});
