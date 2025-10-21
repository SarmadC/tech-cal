import type { Event } from '@/types';
import type { CareerGoal } from '@/types/career';

type GoalMatcher = {
  categories?: string[];
  tags?: string[];
  keywords?: string[];
};

// Configurable taxonomy so career goal widgets can determine alignment from event metadata
const GOAL_MATCHERS: Partial<Record<CareerGoal, GoalMatcher>> = {
  'skill-development': {
    categories: ['workshop', 'training', 'bootcamp', 'course', 'class', 'tutorial', 'hands-on'],
    tags: ['workshop', 'training', 'bootcamp', 'skills', 'hands-on', 'masterclass', 'certification'],
    keywords: ['workshop', 'training', 'bootcamp', 'course', 'tutorial', 'hands-on', 'skill', 'upskill', 'learn']
  },
  'role-transition': {
    categories: ['career', 'job', 'hiring'],
    tags: ['career transition', 'career change', 'job search', 'interview prep', 'resume', 'talent'],
    keywords: [
      'career transition',
      'career change',
      'switch careers',
      'switching careers',
      'new role',
      'role change',
      'career pivot',
      'break into',
      'job search',
      'interview',
      'resume',
      'cv',
      'headhunter',
      'recruiter'
    ]
  },
  'leadership-growth': {
    categories: ['leadership', 'management', 'executive'],
    tags: ['leadership', 'management', 'people management', 'executive', 'influence', 'coaching'],
    keywords: [
      'leadership',
      'manager',
      'management',
      'leading teams',
      'people leader',
      'executive',
      'influence',
      'stakeholder',
      'coaching',
      'mentoring',
      'strategic'
    ]
  },
  'networking': {
    categories: ['networking', 'meetup', 'community', 'social'],
    tags: ['networking', 'community', 'meetup', 'mixer', 'happy hour', 'roundtable', 'social'],
    keywords: [
      'networking',
      'meetup',
      'mixer',
      'happy hour',
      'community',
      'connect',
      'connections',
      'roundtable',
      'social hour',
      'speed networking'
    ]
  }
};

const GOAL_TARGETS: Partial<Record<CareerGoal, number>> = {
  'skill-development': 12,
  'role-transition': 10,
  'leadership-growth': 8,
  'networking': 10
};

function normalize(value?: string | null): string {
  return (value || '').toLowerCase();
}

function matchesFromList(haystack: string, list: string[]): boolean {
  return list.some(item => haystack.includes(item));
}

function matchesTags(tags: string[], needles: string[]): boolean {
  return needles.some(needle => tags.some(tag => tag.includes(needle)));
}

export function doesEventMatchGoal(event: Event, goal: CareerGoal): boolean {
  const matcher = GOAL_MATCHERS[goal];
  if (!matcher) return false;

  const categoryText = normalize(event.category?.name);
  const descriptionText = `${normalize(event.title)} ${normalize(event.description)}`;
  const tagTexts = (event.tags || []).map(tag => normalize(tag.name));

  const categoryMatch = matcher.categories ? matchesFromList(categoryText, matcher.categories) : false;
  const tagMatch = matcher.tags ? matchesTags(tagTexts, matcher.tags) : false;
  const keywordMatch = matcher.keywords ? matchesFromList(descriptionText, matcher.keywords) : false;

  return categoryMatch || tagMatch || keywordMatch;
}

export function getMatchingGoals(event: Event, goals: CareerGoal[]): CareerGoal[] {
  return goals.filter(goal => doesEventMatchGoal(event, goal));
}

export function getGoalTarget(goal: CareerGoal): number {
  return GOAL_TARGETS[goal] ?? 10;
}
