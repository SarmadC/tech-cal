import { createHash } from 'crypto';

import type { Event } from '@/types';
import type { CareerProfile } from '@/types/career';
import type { UserLocation } from '@/services/locationScoringService';

export function buildCareerProfileFingerprint(careerProfile: CareerProfile | null): string {
  if (!careerProfile) return 'cold-start';

  const payload = JSON.stringify({
    role: careerProfile.currentRole || '',
    seniority: careerProfile.seniority || '',
    industry: careerProfile.industry || '',
    primarySkills: (careerProfile.primarySkills || []).slice(0, 8),
    skillsToLearn: (careerProfile.skillsToLearn || []).slice(0, 8),
    interests: (careerProfile.interests || []).slice(0, 8),
    goals: (careerProfile.careerGoals || []).slice(0, 6),
    learningStyle: (careerProfile.learningStyle || []).slice(0, 6),
    networkingGoals: (careerProfile.networkingGoals || []).slice(0, 6),
    preferredEventTypes: (careerProfile.preferredEventTypes || []).slice(0, 6),
  });

  return createHash('sha1').update(payload).digest('hex').slice(0, 16);
}

export function buildLocationFingerprint(userLocation?: UserLocation | null): string {
  if (!userLocation) return 'none';

  const normalize = (value?: string) => value?.trim().toLowerCase() || '';
  const payload = JSON.stringify({
    city: normalize(userLocation.city),
    country: normalize(userLocation.country),
    timezone: normalize(userLocation.timezone),
  });

  return createHash('sha1').update(payload).digest('hex').slice(0, 12);
}

export function buildEventFingerprint(event: Event): string {
  const payload = JSON.stringify({
    id: event.id,
    title: event.title,
    startTime: event.startTime,
    endTime: event.endTime,
    eventTypeId: event.eventTypeId,
  });

  return createHash('sha1').update(payload).digest('hex').slice(0, 12);
}
