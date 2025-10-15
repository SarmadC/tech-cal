/**
 * UI wrapper for career alignment calculator
 * 
 * This module adds UI-specific properties (icons, colors) to the pure scoring core.
 * The actual scoring logic lives in src/lib/recommendation/alignmentCore.ts
 * 
 * Follows DRY principle: UI concerns separated from business logic.
 */

import { Event, CareerProfile } from '@/types';
import { BookOpen, TrendUp, Target, Sparkle, Users } from '@phosphor-icons/react';
import { calculateAlignment, type AlignmentReason } from '@/lib/recommendation/alignmentCore';

/**
 * UI-enhanced alignment reason with icons and colors
 */
interface UIAlignmentReason extends AlignmentReason {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

/**
 * UI-enhanced alignment result for dashboard display
 */
export interface EventCareerAlignment {
  event: Event;
  alignmentScore: number;
  alignmentReasons: UIAlignmentReason[];
  matchedSkills: string[];
  matchedGoals: string[];
}

/**
 * Map alignment reason type to UI properties (icon and color)
 */
function getUIPropertiesForReason(reason: AlignmentReason): UIAlignmentReason {
  const iconMap: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
    skill: reason.reason.startsWith('Learn') 
      ? { icon: BookOpen, color: 'text-blue-600 dark:text-blue-400' }
      : { icon: TrendUp, color: 'text-green-600 dark:text-green-400' },
    goal: { icon: Target, color: 'text-purple-600 dark:text-purple-400' },
    interest: { icon: Sparkle, color: 'text-pink-600 dark:text-pink-400' },
    'learning-style': { icon: BookOpen, color: 'text-orange-600 dark:text-orange-400' },
    networking: { icon: Users, color: 'text-teal-600 dark:text-teal-400' }
  };

  const uiProps = iconMap[reason.type] || { icon: BookOpen, color: 'text-gray-600 dark:text-gray-400' };

  return {
    ...reason,
    icon: uiProps.icon,
    color: uiProps.color
  };
}

/**
 * Calculate career alignment for an event with UI properties
 * 
 * This wraps the pure core calculator and adds icons/colors for dashboard display.
 * For server-side scoring or testing, use calculateAlignment from alignmentCore.ts directly.
 */
export function calculateEventAlignment(event: Event, careerProfile: CareerProfile): EventCareerAlignment {
  // Use pure core calculator
  const coreResult = calculateAlignment(event, careerProfile);

  // Add UI properties to reasons
  const uiReasons = coreResult.alignmentReasons.map(getUIPropertiesForReason);

  return {
    event,
    alignmentScore: coreResult.overall,
    alignmentReasons: uiReasons,
    matchedSkills: coreResult.matchedSkills,
    matchedGoals: coreResult.matchedGoals
  };
}

/**
 * Get match quality description based on score
 * Re-exported from core for convenience
 */
export { getMatchQuality } from '@/lib/recommendation/alignmentCore';

/**
 * Get match quality color based on score (UI-specific)
 */
export function getMatchColor(score: number): string {
  if (score >= 80) return 'text-green-400';
  if (score >= 50) return 'text-blue-400';
  if (score >= 20) return 'text-blue-400';
  return 'text-gray-400';
}
