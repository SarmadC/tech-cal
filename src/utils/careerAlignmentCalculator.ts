import { Event, CareerProfile } from '@/types';
import { BookOpen, TrendUp, Target, Sparkle, Users } from '@phosphor-icons/react';

export interface EventCareerAlignment {
  event: Event;
  alignmentScore: number;
  alignmentReasons: Array<{
    type: 'skill' | 'goal' | 'interest' | 'learning-style' | 'networking';
    reason: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    contribution: number;
  }>;
  matchedSkills: string[];
  matchedGoals: string[];
}

/**
 * Calculate career alignment for an event based on user's career profile
 * Extracted from CareerAlignedEventsCard.tsx to follow DRY principle
 */
export function calculateEventAlignment(event: Event, careerProfile: CareerProfile): EventCareerAlignment {
  const alignmentReasons: EventCareerAlignment['alignmentReasons'] = [];
  let alignmentScore = 0;
  const matchedSkills: string[] = [];
  const matchedGoals: string[] = [];

  const eventTitle = event.title.toLowerCase();
  const eventDesc = event.description?.toLowerCase() || '';
  const eventText = `${eventTitle} ${eventDesc}`;

  // Check skill alignment (skills to learn = higher priority)
  careerProfile.skillsToLearn.forEach(skill => {
    if (eventText.includes(skill.toLowerCase())) {
      const contribution = 20;
      alignmentScore += contribution;
      matchedSkills.push(skill);
      alignmentReasons.push({
        type: 'skill',
        reason: `Learn ${skill}`,
        icon: BookOpen,
        color: 'text-blue-600 dark:text-blue-400',
        contribution
      });
    }
  });

  // Check primary skills (maintenance/advancement)
  careerProfile.primarySkills.slice(0, 5).forEach(skill => {
    if (eventText.includes(skill.toLowerCase())) {
      const contribution = 10;
      alignmentScore += contribution;
      matchedSkills.push(skill);
      alignmentReasons.push({
        type: 'skill',
        reason: `Advance ${skill} skills`,
        icon: TrendUp,
        color: 'text-green-600 dark:text-green-400',
        contribution
      });
    }
  });

  // Check career goals alignment
  careerProfile.careerGoals.forEach(goal => {
    const goalKeywords = {
      'skill-development': ['workshop', 'training', 'bootcamp', 'course', 'learn'],
      'career-advancement': ['leadership', 'management', 'promotion', 'senior'],
      'role-transition': ['career', 'transition', 'new role', 'switch'],
      'leadership-growth': ['leadership', 'management', 'team', 'executive'],
      'entrepreneurship': ['startup', 'founder', 'business', 'entrepreneurship'],
      'networking': ['networking', 'meetup', 'connections', 'community'],
      'specialization': ['expert', 'advanced', 'deep dive', 'mastery'],
      'generalization': ['full-stack', 'broad', 'overview', 'introduction']
    };

    const keywords = goalKeywords[goal as keyof typeof goalKeywords] || [];
    const hasMatch = keywords.some(keyword => eventText.includes(keyword));

    if (hasMatch) {
      const contribution = 15;
      alignmentScore += contribution;
      matchedGoals.push(goal);
      alignmentReasons.push({
        type: 'goal',
        reason: `Supports ${goal.replace('-', ' ')}`,
        icon: Target,
        color: 'text-purple-600 dark:text-purple-400',
        contribution
      });
    }
  });

  // Check interests alignment
  careerProfile.interests.slice(0, 5).forEach(interest => {
    if (eventText.includes(interest.toLowerCase())) {
      const contribution = 8;
      alignmentScore += contribution;
      alignmentReasons.push({
        type: 'interest',
        reason: `Matches interest: ${interest}`,
        icon: Sparkle,
        color: 'text-pink-600 dark:text-pink-400',
        contribution
      });
    }
  });

  // Check learning style alignment
  const learningStyleKeywords: Record<string, string[]> = {
    'hands-on': ['workshop', 'lab', 'hands-on', 'practical', 'coding'],
    'theoretical': ['lecture', 'presentation', 'keynote', 'talk'],
    'interactive': ['panel', 'discussion', 'q&a', 'interactive'],
    'networking': ['networking', 'meetup', 'mixer', 'social'],
    'case-studies': ['case study', 'real-world', 'example', 'demo'],
    'peer': ['community', 'peer', 'group', 'collaborative']
  };

  careerProfile.learningStyle.forEach(style => {
    const keywords = learningStyleKeywords[style] || [];
    const hasMatch = keywords.some(keyword => eventText.includes(keyword));

    if (hasMatch) {
      const contribution = 5;
      alignmentScore += contribution;
      alignmentReasons.push({
        type: 'learning-style',
        reason: `Fits ${style.replace('-', ' ')} learning`,
        icon: BookOpen,
        color: 'text-orange-600 dark:text-orange-400',
        contribution
      });
    }
  });

  // Check networking goals alignment
  if (careerProfile.networkingGoals.length > 0 &&
      (eventText.includes('networking') || eventText.includes('meetup') || eventText.includes('community'))) {
    const contribution = 10;
    alignmentScore += contribution;
    alignmentReasons.push({
      type: 'networking',
      reason: 'Networking opportunity',
      icon: Users,
      color: 'text-teal-600 dark:text-teal-400',
      contribution
    });
  }

  // Normalize score to 0-100
  const normalizedScore = Math.min(100, alignmentScore);

  return {
    event,
    alignmentScore: normalizedScore,
    alignmentReasons: alignmentReasons, // Show all reasons
    matchedSkills: [...new Set(matchedSkills)],
    matchedGoals: [...new Set(matchedGoals)]
  };
}

/**
 * Get match quality description based on score
 */
export function getMatchQuality(score: number): string {
  if (score >= 80) return 'Perfect';
  if (score >= 50) return 'Strong';
  if (score >= 20) return 'Good';
  return 'Fair';
}

/**
 * Get match quality color based on score
 */
export function getMatchColor(score: number): string {
  if (score >= 80) return 'text-green-400';
  if (score >= 50) return 'text-blue-400';
  if (score >= 20) return 'text-blue-400';
  return 'text-gray-400';
}
