/**
 * Networking Scoring Utilities
 *
 * Extracted from AdvancedScorer to improve maintainability.
 * Contains functions for speaker quality, networking opportunities, and event scale evaluation.
 *
 * Used by: AdvancedScorer.calculateNetworkingValueScore()
 */

import { Event } from '@/types';
import { CareerProfile } from '@/types/career';
import { normalizeEventType } from '@/utils/eventTypeUtils';
import { hasSeniorSpeaker } from '@/utils/speakerUtils';

/**
 * Industry keywords for networking alignment
 */
const INDUSTRY_KEYWORDS: Record<string, readonly string[]> = {
  'technology': ['tech', 'software', 'digital', 'innovation', 'startup', 'ai', 'ml'],
  'finance': ['finance', 'fintech', 'banking', 'investment', 'trading', 'crypto'],
  'healthcare': ['healthcare', 'medical', 'pharma', 'biotech', 'clinical'],
  'education': ['education', 'edtech', 'learning', 'training', 'academic'],
  'retail': ['retail', 'ecommerce', 'consumer', 'shopping', 'marketplace'],
} as const;

/**
 * Prestigious companies for speaker quality scoring
 */
const PRESTIGIOUS_COMPANIES = [
  'google', 'microsoft', 'amazon', 'apple', 'meta', 'netflix', 'uber', 'airbnb'
] as const;

/**
 * Prestigious event organizers for scale scoring
 */
const PRESTIGIOUS_ORGANIZERS = [
  'google', 'microsoft', 'aws', 'oracle', 'salesforce', 'adobe'
] as const;

/**
 * Networking base scores by event type
 */
const NETWORKING_BASE_SCORES: Record<string, number> = {
  conference: 90,
  meetup: 85,
  workshop: 60,
  webinar: 20,
} as const;

/**
 * Analyze speaker quality based on titles, companies, and industry alignment
 */
export function analyzeSpeakerQuality(event: Event, careerProfile: CareerProfile): number {
  const speakers = event.speakerLineup || [];
  if (speakers.length === 0) return 30;

  let score = 0;
  const industry = careerProfile.industry?.toLowerCase() || '';
  const seniority = careerProfile.seniority || 'mid-level';

  for (const speaker of speakers) {
    let speakerScore = 50;

    const title = speaker.title?.toLowerCase() || '';
    const company = speaker.company?.toLowerCase() || '';

    if (title.includes('ceo') || title.includes('cto') || title.includes('vp') ||
        title.includes('director') || title.includes('head')) {
      speakerScore += 25;
    }
    else if (title.includes('senior') || title.includes('principal') ||
             title.includes('architect') || title.includes('lead')) {
      speakerScore += 20;
    }
    else if (title.includes('engineer') || title.includes('developer') ||
             title.includes('manager') || title.includes('analyst')) {
      speakerScore += 15;
    }

    if (PRESTIGIOUS_COMPANIES.some(prestigious => company.includes(prestigious))) {
      speakerScore += 20;
    }

    if (industry && (title.includes(industry) || company.includes(industry))) {
      speakerScore += 15;
    }

    if ((seniority === 'senior' && title.includes('senior')) ||
        (seniority === 'junior' && !title.includes('senior') && !title.includes('lead'))) {
      speakerScore += 10;
    }

    score += Math.min(speakerScore, 100);
  }

  const averaged = score / speakers.length;
  // Senior presence bonus (small, additive, bounded) applied after averaging
  const seniorBonus = hasSeniorSpeaker(speakers) ? 10 : 0;
  return Math.min(averaged + seniorBonus, 100);
}

/**
 * Analyze networking opportunities based on event type and size
 */
export function analyzeNetworkingOpportunities(event: Event): number {
  let score = 40;
  const rawType = (event.category?.name || '').toLowerCase();
  const canonical = normalizeEventType(rawType);

  if (canonical in NETWORKING_BASE_SCORES) {
    score = Math.max(score, NETWORKING_BASE_SCORES[canonical]);
  } else if (rawType.includes('social')) {
    score = Math.max(score, 80);
  } else if (rawType.includes('training') || rawType.includes('course')) {
    score = Math.max(score, 50);
  }

  const attendeeCount = event.attendeeCount || 0;
  if (attendeeCount >= 50 && attendeeCount <= 200) {
    score += 15;
  } else if (attendeeCount >= 20 && attendeeCount < 50) {
    score += 10;
  } else if (attendeeCount > 200 && attendeeCount <= 500) {
    score += 5;
  } else if (attendeeCount > 500) {
    score -= 10;
  }

  if (event.title?.toLowerCase().includes('network') ||
      event.description?.toLowerCase().includes('network')) {
    score += 10;
  }

  return Math.min(score, 100);
}

/**
 * Apply boosts based on networking goals
 */
export function applyNetworkingGoalBoosts(event: Event, careerProfile: CareerProfile): number {
  const goals = careerProfile.networkingGoals || [];
  if (!goals.length) return 0;

  const rawType = (event.category?.name || '').toLowerCase();
  const canonical = normalizeEventType(rawType);
  const speakers = event.speakerLineup || [];
  const attendees = event.attendeeCount || 0;
  const description = (event.description || '').toLowerCase();

  let boost = 0;

  for (const goal of goals) {
    switch (goal) {
      case 'find-mentors': {
        if (hasSeniorSpeaker(speakers)) boost += 12;
        if (['summit', 'executive', 'leadership'].some(t => rawType.includes(t))) boost += 8;
        break;
      }
      case 'find-peers': {
        if (canonical === 'meetup') boost += 12;
        if (attendees >= 50 && attendees <= 200) boost += 10;
        else if (attendees > 200 && attendees <= 500) boost += 6;
        // Small alignment nudge for meetups in a narrower sweet spot
        if (canonical === 'meetup') {
          if (attendees >= 30 && attendees <= 80) boost += 2; // intimate groups
          else if (attendees > 80 && attendees <= 150) boost += 1; // still conducive
        }
        break;
      }
      case 'find-collaborators': {
        if (canonical === 'workshop' || rawType.includes('project')) boost += 15; // hackathon/bootcamp alias → workshop
        if (description.includes('team') || description.includes('collaborate')) boost += 6;
        break;
      }
      case 'find-employers': {
        if (['career', 'fair', 'recruiting', 'hiring', 'job'].some(t => rawType.includes(t))) boost += 16;
        if (description.includes('hiring') || description.includes('recruiting')) boost += 8;
        break;
      }
      case 'industry-insights': {
        if (canonical === 'conference' || rawType.includes('summit') || rawType.includes('panel')) boost += 12;
        if (speakers.length >= 3) boost += 6;
        break;
      }
      case 'thought-leadership': {
        if (canonical === 'conference' || rawType.includes('summit')) boost += 12;
        if (description.includes('call for speakers') || description.includes('speaking opportunity')) boost += 10;
        break;
      }
      default:
        break;
    }
  }

  return boost;
}

/**
 * Analyze industry alignment for networking value
 */
export function analyzeIndustryNetworking(event: Event, careerProfile: CareerProfile): number {
  const industry = careerProfile.industry?.toLowerCase() || '';
  if (!industry) return 60;

  const eventText = `${event.title || ''} ${event.description || ''}`.toLowerCase();

  const keywords = INDUSTRY_KEYWORDS[industry] || [];
  let score = 50;

  for (const keyword of keywords) {
    if (eventText.includes(keyword)) {
      score += 10;
    }
  }

  const speakers = event.speakerLineup || [];
  for (const speaker of speakers) {
    const company = speaker.company?.toLowerCase() || '';
    if (company.includes(industry)) {
      score += 15;
    }
  }

  return Math.min(score, 100);
}

/**
 * Analyze event scale and prestige
 */
export function analyzeEventScale(event: Event): number {
  let score = 50;

  const attendeeCount = event.attendeeCount || 0;
  if (attendeeCount >= 1000) {
    score += 30;
  } else if (attendeeCount >= 500) {
    score += 20;
  } else if (attendeeCount >= 100) {
    score += 10;
  }

  const organizer = event.organizer?.toLowerCase() || '';
  if (PRESTIGIOUS_ORGANIZERS.some(prestigious => organizer.includes(prestigious))) {
    score += 20;
  }

  if (event.startTime && event.endTime) {
    const duration = new Date(event.endTime).getTime() - new Date(event.startTime).getTime();
    const days = duration / (1000 * 60 * 60 * 24);
    if (days >= 2) {
      score += 15;
    } else if (days >= 1) {
      score += 10;
    }
  }

  return Math.min(score, 100);
}
