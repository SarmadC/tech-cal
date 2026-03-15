#!/usr/bin/env tsx

import { config } from 'dotenv';
import { resolve } from 'path';
import { randomUUID } from 'node:crypto';
import { v5 as uuidv5 } from 'uuid';
import type { SupabaseClientType } from '@/utils/supabase/service';
import { createServiceClient } from '@/utils/supabase/service';
import type { Database, Enums, TablesInsert } from '@/types/supabase';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });
config();

export const SHOWCASE_NAMESPACE = 'community-showcase';
export const SHOWCASE_EVENT_PREFIX = 'community-showcase-event';
export const SHOWCASE_CIRCLE_PREFIX = 'community-showcase-circle';
export const SHOWCASE_PROFILE_PREFIX = 'community-showcase-profile';
export const SHOWCASE_POST_PREFIX = 'community-showcase-post';
export const SHOWCASE_COMMENT_PREFIX = 'community-showcase-comment';
export const SHOWCASE_USER_EVENT_PREFIX = 'community-showcase-user-event';

type CareerProfileInsert = TablesInsert<'career_profiles'>;
type CircleInsert = TablesInsert<'circles'>;
type CircleCommentInsert = TablesInsert<'circle_comments'>;
type CircleMemberInsert = TablesInsert<'circle_members'>;
type CirclePostInsert = TablesInsert<'circle_posts'>;
type EventInsert = TablesInsert<'events'>;
type ProfileInsert = TablesInsert<'profiles'>;
type UserEventInsert = TablesInsert<'user_events'>;
type UserSocialStatsInsert = TablesInsert<'user_social_stats'>;

type Seniority = Enums<'seniority_level'>;
type CompanySize = Enums<'company_size_enum'>;
type CareerGoal = Enums<'career_goal_enum'>;
type CareerEventType = Enums<'career_event_type_enum'>;
type LearningStyle = Enums<'learning_style_enum'>;
type NetworkingGoal = Enums<'networking_goal_enum'>;
type CareerTimeframe = Enums<'career_timeframe_enum'>;
type AvailableTime = Enums<'available_time_enum'>;
type BudgetRange = Enums<'budget_range_enum'>;
type EventFormat = Enums<'event_format_enum'>;
type EventStatus = Enums<'event_status_enum'>;
type PricingType = Enums<'pricing_type_enum'>;

interface ShowcaseProfileDefinition {
  slug: string;
  fullName: string;
  username: string;
  headline: string;
  location: string;
  createdAt: string;
  avatarUrl: string | null;
  followerCount: number;
  followingCount: number;
  showAttendance: boolean;
  career: {
    currentRole: string;
    seniority: Seniority;
    industry: string;
    companySize: CompanySize;
    primarySkills: string[];
    skillsToLearn: string[];
    interests: string[];
    careerGoals: CareerGoal[];
    timeframe: CareerTimeframe;
    targetPath: string;
    learningStyle: LearningStyle[];
    networkingGoals: NetworkingGoal[];
    preferredEventTypes: CareerEventType[];
    availableTime: AvailableTime;
    budget: BudgetRange;
  };
}

interface ShowcaseCircleDefinition {
  slug: string;
  name: string;
  description: string;
  memberCount: number;
  members: string[];
}

interface ShowcasePostDefinition {
  slug: string;
  authorSlug: string;
  circleSlug: string;
  createdAt: string;
  content: string;
  comments: Array<{
    slug: string;
    authorSlug: string;
    createdAt: string;
    content: string;
  }>;
}

interface ShowcaseEventDefinition {
  slug: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  eventFormat: EventFormat;
  pricingType: PricingType;
  attendeeCount: number;
  bookmarkedBy: string[];
  attendingBy: string[];
}

interface ShowcaseDataset {
  profiles: ProfileInsert[];
  userSocialStats: UserSocialStatsInsert[];
  careerProfiles: CareerProfileInsert[];
  circles: CircleInsert[];
  circleMembers: CircleMemberInsert[];
  circlePosts: CirclePostInsert[];
  circleComments: CircleCommentInsert[];
  events: EventInsert[];
  userEvents: UserEventInsert[];
  ids: {
    profileIds: string[];
    circleIds: string[];
    postIds: string[];
    commentIds: string[];
    eventIds: string[];
    userEventIds: string[];
  };
}

const DEFAULT_TIMEZONE = 'America/Los_Angeles';
const SHOWCASE_UPDATED_AT = '2026-03-14T12:00:00.000Z';
const SHOWCASE_EVENT_STATUS: EventStatus = 'Confirmed';
const SHOWCASE_EVENT_STATUS_LOWERCASE = 'confirmed';
const SHOWCASE_UUID_NAMESPACE = '4a0c7b0c-c8f4-4d89-8f1b-2d33f26f6b49';

const SHOWCASE_PROFILES: ShowcaseProfileDefinition[] = [
  {
    slug: 'maya-chen',
    fullName: 'Maya Chen',
    username: 'maya_builds',
    headline: 'Staff product engineer building calmer event tooling for distributed teams.',
    location: 'San Francisco, CA',
    createdAt: '2025-11-02T09:00:00.000Z',
    avatarUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=Maya%20Chen',
    followerCount: 842,
    followingCount: 214,
    showAttendance: true,
    career: {
      currentRole: 'product-engineer',
      seniority: 'staff',
      industry: 'Developer Tools',
      companySize: 'startup',
      primarySkills: ['TypeScript', 'Product strategy', 'Design systems'],
      skillsToLearn: ['Staff mentoring', 'AI product patterns'],
      interests: ['Developer experience', 'Platform tooling', 'Founder stories'],
      careerGoals: ['leadership-growth', 'specialization'],
      timeframe: 'medium-term',
      targetPath: 'Product engineering leadership',
      learningStyle: ['interactive', 'peer-learning'],
      networkingGoals: ['find-peers', 'thought-leadership'],
      preferredEventTypes: ['conference', 'meetup', 'networking'],
      availableTime: 'moderate',
      budget: 'moderate',
    },
  },
  {
    slug: 'diego-romero',
    fullName: 'Diego Romero',
    username: 'diegodata',
    headline: 'Applied ML lead turning messy community signals into useful products.',
    location: 'Austin, TX',
    createdAt: '2025-10-17T14:00:00.000Z',
    avatarUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=Diego%20Romero',
    followerCount: 1190,
    followingCount: 301,
    showAttendance: true,
    career: {
      currentRole: 'applied-ml-lead',
      seniority: 'lead',
      industry: 'Artificial Intelligence',
      companySize: 'medium',
      primarySkills: ['LLM evaluation', 'Python', 'Experiment design'],
      skillsToLearn: ['Agent architecture', 'Inference optimization'],
      interests: ['Open-source AI', 'Evaluation tooling', 'AI teams'],
      careerGoals: ['specialization', 'career-advancement'],
      timeframe: 'short-term',
      targetPath: 'Head of applied AI',
      learningStyle: ['hands-on', 'case-studies'],
      networkingGoals: ['industry-insights', 'find-collaborators'],
      preferredEventTypes: ['summit', 'conference', 'workshop'],
      availableTime: 'flexible',
      budget: 'high',
    },
  },
  {
    slug: 'amal-nasser',
    fullName: 'Amal Nasser',
    username: 'amalux',
    headline: 'Design systems lead connecting product craft, accessibility, and community ops.',
    location: 'Brooklyn, NY',
    createdAt: '2025-09-11T11:30:00.000Z',
    avatarUrl: null,
    followerCount: 675,
    followingCount: 182,
    showAttendance: true,
    career: {
      currentRole: 'design-systems-lead',
      seniority: 'lead',
      industry: 'Product Design',
      companySize: 'large',
      primarySkills: ['Design systems', 'Accessibility', 'Figma ops'],
      skillsToLearn: ['Design org strategy', 'Inclusive research'],
      interests: ['Product craft', 'Accessibility', 'Community rituals'],
      careerGoals: ['leadership-growth', 'networking'],
      timeframe: 'medium-term',
      targetPath: 'Director of design systems',
      learningStyle: ['interactive', 'case-studies'],
      networkingGoals: ['find-peers', 'thought-leadership'],
      preferredEventTypes: ['meetup', 'conference', 'networking'],
      availableTime: 'moderate',
      budget: 'moderate',
    },
  },
  {
    slug: 'erin-oliver',
    fullName: 'Erin Oliver',
    username: 'erininfra',
    headline: 'Platform SRE scaling internal developer platforms and sharper incident reviews.',
    location: 'Seattle, WA',
    createdAt: '2025-08-24T08:45:00.000Z',
    avatarUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=Erin%20Oliver',
    followerCount: 938,
    followingCount: 247,
    showAttendance: true,
    career: {
      currentRole: 'platform-sre',
      seniority: 'senior',
      industry: 'Cloud Infrastructure',
      companySize: 'enterprise',
      primarySkills: ['Kubernetes', 'Incident response', 'Observability'],
      skillsToLearn: ['Platform product thinking', 'Leadership communication'],
      interests: ['Reliability', 'Platform engineering', 'Operations culture'],
      careerGoals: ['specialization', 'leadership-growth'],
      timeframe: 'medium-term',
      targetPath: 'Platform engineering manager',
      learningStyle: ['hands-on', 'theoretical'],
      networkingGoals: ['find-mentors', 'industry-insights'],
      preferredEventTypes: ['conference', 'workshop', 'meetup'],
      availableTime: 'limited',
      budget: 'high',
    },
  },
  {
    slug: 'nina-patel',
    fullName: 'Nina Patel',
    username: 'ninafounds',
    headline: 'Early-stage founder building community-first workflows for independent operators.',
    location: 'Toronto, ON',
    createdAt: '2025-12-08T10:15:00.000Z',
    avatarUrl: null,
    followerCount: 1505,
    followingCount: 416,
    showAttendance: true,
    career: {
      currentRole: 'founder',
      seniority: 'founder',
      industry: 'SaaS',
      companySize: 'startup',
      primarySkills: ['Go-to-market', 'User research', 'Product strategy'],
      skillsToLearn: ['Fundraising storytelling', 'Community-led growth'],
      interests: ['Founder circles', 'Product strategy', 'Community business'],
      careerGoals: ['entrepreneurship', 'networking'],
      timeframe: 'immediate',
      targetPath: 'Category-defining founder',
      learningStyle: ['interactive', 'networking'],
      networkingGoals: ['find-collaborators', 'find-employers'],
      preferredEventTypes: ['networking', 'summit', 'conference'],
      availableTime: 'flexible',
      budget: 'unlimited',
    },
  },
  {
    slug: 'samir-khan',
    fullName: 'Samir Khan',
    username: 'samirship',
    headline: 'Developer relations manager helping technical communities turn into repeatable growth loops.',
    location: 'Chicago, IL',
    createdAt: '2025-07-02T13:20:00.000Z',
    avatarUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=Samir%20Khan',
    followerCount: 724,
    followingCount: 389,
    showAttendance: true,
    career: {
      currentRole: 'developer-relations-manager',
      seniority: 'manager',
      industry: 'Developer Marketing',
      companySize: 'medium',
      primarySkills: ['Community strategy', 'Speaking', 'Program design'],
      skillsToLearn: ['Partnership strategy', 'Event measurement'],
      interests: ['DevRel', 'Community programs', 'Open-source growth'],
      careerGoals: ['career-advancement', 'leadership-growth'],
      timeframe: 'short-term',
      targetPath: 'Head of developer community',
      learningStyle: ['interactive', 'networking'],
      networkingGoals: ['find-peers', 'thought-leadership'],
      preferredEventTypes: ['networking', 'meetup', 'conference'],
      availableTime: 'moderate',
      budget: 'moderate',
    },
  },
  {
    slug: 'lucia-mora',
    fullName: 'Lucia Mora',
    username: 'luciasec',
    headline: 'Application security engineer translating secure defaults into product velocity.',
    location: 'Denver, CO',
    createdAt: '2025-06-19T16:30:00.000Z',
    avatarUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=Lucia%20Mora',
    followerCount: 558,
    followingCount: 167,
    showAttendance: false,
    career: {
      currentRole: 'application-security-engineer',
      seniority: 'senior',
      industry: 'Cybersecurity',
      companySize: 'large',
      primarySkills: ['Threat modeling', 'Secure SDLC', 'Cloud security'],
      skillsToLearn: ['Security leadership', 'Product security metrics'],
      interests: ['Product security', 'Cloud security', 'Security culture'],
      careerGoals: ['specialization', 'leadership-growth'],
      timeframe: 'long-term',
      targetPath: 'Director of product security',
      learningStyle: ['case-studies', 'theoretical'],
      networkingGoals: ['find-mentors', 'industry-insights'],
      preferredEventTypes: ['conference', 'workshop', 'summit'],
      availableTime: 'limited',
      budget: 'high',
    },
  },
  {
    slug: 'owen-brooks',
    fullName: 'Owen Brooks',
    username: 'owenmobile',
    headline: 'Mobile product engineer obsessed with onboarding flow speed and retention loops.',
    location: 'Los Angeles, CA',
    createdAt: '2025-05-06T09:40:00.000Z',
    avatarUrl: null,
    followerCount: 432,
    followingCount: 210,
    showAttendance: true,
    career: {
      currentRole: 'mobile-product-engineer',
      seniority: 'mid-level',
      industry: 'Consumer Apps',
      companySize: 'small',
      primarySkills: ['React Native', 'Growth experiments', 'Mobile UX'],
      skillsToLearn: ['Native performance', 'Consumer monetization'],
      interests: ['Consumer apps', 'Mobile growth', 'Retention'],
      careerGoals: ['career-advancement', 'specialization'],
      timeframe: 'short-term',
      targetPath: 'Senior mobile engineer',
      learningStyle: ['hands-on', 'peer-learning'],
      networkingGoals: ['find-peers', 'find-collaborators'],
      preferredEventTypes: ['meetup', 'workshop', 'conference'],
      availableTime: 'moderate',
      budget: 'low',
    },
  },
  {
    slug: 'jules-hart',
    fullName: 'Jules Hart',
    username: 'julesgrowth',
    headline: 'Product marketer crosswiring launch strategy, creator partnerships, and community moments.',
    location: 'Miami, FL',
    createdAt: '2025-04-28T15:10:00.000Z',
    avatarUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=Jules%20Hart',
    followerCount: 801,
    followingCount: 332,
    showAttendance: true,
    career: {
      currentRole: 'product-marketer',
      seniority: 'senior',
      industry: 'B2B SaaS',
      companySize: 'medium',
      primarySkills: ['Positioning', 'Launch planning', 'Partnerships'],
      skillsToLearn: ['Community-led growth', 'Founder marketing'],
      interests: ['Launch strategy', 'Community growth', 'Creator ecosystems'],
      careerGoals: ['salary-increase', 'networking'],
      timeframe: 'short-term',
      targetPath: 'Head of product marketing',
      learningStyle: ['interactive', 'case-studies'],
      networkingGoals: ['find-collaborators', 'thought-leadership'],
      preferredEventTypes: ['summit', 'networking', 'conference'],
      availableTime: 'flexible',
      budget: 'moderate',
    },
  },
  {
    slug: 'talia-ng',
    fullName: 'Talia Ng',
    username: 'taliaops',
    headline: 'Community operations lead building repeatable rituals for remote-first member programs.',
    location: 'Vancouver, BC',
    createdAt: '2025-03-15T12:25:00.000Z',
    avatarUrl: null,
    followerCount: 367,
    followingCount: 275,
    showAttendance: true,
    career: {
      currentRole: 'community-operations-lead',
      seniority: 'manager',
      industry: 'Community Platforms',
      companySize: 'small',
      primarySkills: ['Community ops', 'Member programming', 'Automation'],
      skillsToLearn: ['Revenue partnerships', 'Lifecycle analytics'],
      interests: ['Community rituals', 'Creator programs', 'Online events'],
      careerGoals: ['career-advancement', 'leadership-growth'],
      timeframe: 'medium-term',
      targetPath: 'Director of community operations',
      learningStyle: ['peer-learning', 'interactive'],
      networkingGoals: ['find-peers', 'industry-insights'],
      preferredEventTypes: ['networking', 'meetup', 'webinar'],
      availableTime: 'moderate',
      budget: 'low',
    },
  },
  {
    slug: 'haruto-sato',
    fullName: 'Haruto Sato',
    username: 'harutoweb',
    headline: 'Frontend architect chasing faster collaboration between design, engineering, and content.',
    location: 'Portland, OR',
    createdAt: '2025-02-04T07:55:00.000Z',
    avatarUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=Haruto%20Sato',
    followerCount: 923,
    followingCount: 263,
    showAttendance: true,
    career: {
      currentRole: 'frontend-architect',
      seniority: 'principal',
      industry: 'Web Platforms',
      companySize: 'enterprise',
      primarySkills: ['Frontend architecture', 'Performance', 'Design systems'],
      skillsToLearn: ['AI interfaces', 'Org-level standards'],
      interests: ['Frontend systems', 'Performance', 'Design-engineering collaboration'],
      careerGoals: ['leadership-growth', 'specialization'],
      timeframe: 'medium-term',
      targetPath: 'VP of frontend platform',
      learningStyle: ['hands-on', 'theoretical'],
      networkingGoals: ['find-peers', 'thought-leadership'],
      preferredEventTypes: ['conference', 'workshop', 'meetup'],
      availableTime: 'moderate',
      budget: 'high',
    },
  },
  {
    slug: 'priya-mehta',
    fullName: 'Priya Mehta',
    username: 'priyacloud',
    headline: 'Cloud architect mapping platform decisions back to developer happiness and cost clarity.',
    location: 'Boston, MA',
    createdAt: '2025-01-12T10:05:00.000Z',
    avatarUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=Priya%20Mehta',
    followerCount: 1104,
    followingCount: 287,
    showAttendance: false,
    career: {
      currentRole: 'cloud-architect',
      seniority: 'principal',
      industry: 'Cloud Infrastructure',
      companySize: 'enterprise',
      primarySkills: ['Cloud architecture', 'FinOps', 'Platform strategy'],
      skillsToLearn: ['Executive storytelling', 'AI infrastructure'],
      interests: ['Cloud platforms', 'FinOps', 'Developer experience'],
      careerGoals: ['leadership-growth', 'specialization'],
      timeframe: 'long-term',
      targetPath: 'VP of platform strategy',
      learningStyle: ['case-studies', 'theoretical'],
      networkingGoals: ['find-employers', 'industry-insights'],
      preferredEventTypes: ['conference', 'summit', 'workshop'],
      availableTime: 'limited',
      budget: 'unlimited',
    },
  },
];

const SHOWCASE_CIRCLES: ShowcaseCircleDefinition[] = [
  {
    slug: 'product-systems',
    name: 'Product Systems',
    description: 'For product-minded engineers and designers who care about craft, speed, and calmer team rituals.',
    memberCount: 314,
    members: ['maya-chen', 'amal-nasser', 'haruto-sato', 'jules-hart', 'owen-brooks'],
  },
  {
    slug: 'ai-builders',
    name: 'AI Builders',
    description: 'Applied ML leads, founders, and platform teams comparing what actually works in production.',
    memberCount: 428,
    members: ['diego-romero', 'nina-patel', 'priya-mehta', 'maya-chen', 'samir-khan'],
  },
  {
    slug: 'platform-ops',
    name: 'Platform Ops',
    description: 'Reliability, infrastructure, platform thinking, and the messy reality of internal developer tooling.',
    memberCount: 267,
    members: ['erin-oliver', 'priya-mehta', 'lucia-mora', 'haruto-sato'],
  },
  {
    slug: 'community-led-growth',
    name: 'Community Led Growth',
    description: 'DevRel, community ops, and marketing people building repeatable programs instead of one-off events.',
    memberCount: 386,
    members: ['samir-khan', 'talia-ng', 'jules-hart', 'nina-patel', 'amal-nasser'],
  },
  {
    slug: 'founder-signal',
    name: 'Founder Signal',
    description: 'Founders and operators trading notes on product bets, customer conversations, and momentum.',
    memberCount: 223,
    members: ['nina-patel', 'maya-chen', 'diego-romero', 'jules-hart'],
  },
];

const SHOWCASE_POSTS: ShowcasePostDefinition[] = [
  {
    slug: 'product-systems-office-hours',
    authorSlug: 'maya-chen',
    circleSlug: 'product-systems',
    createdAt: '2026-03-14T16:20:00.000Z',
    content: 'What is one thing your team added this quarter that actually made launches calmer?\n\nWe started writing a short launch brief before design review. Nothing fancy, just problem, audience, and what success looks like. It cut a lot of the “wait, what are we shipping?” back-and-forth.',
    comments: [
      { slug: 'ps-1', authorSlug: 'amal-nasser', createdAt: '2026-03-14T16:34:00.000Z', content: 'We added one line called “main risk to the experience” and reviews got way better.' },
      { slug: 'ps-2', authorSlug: 'haruto-sato', createdAt: '2026-03-14T16:39:00.000Z', content: 'We do the same for performance tradeoffs. Having an owner early saves a lot of late arguments.' },
      { slug: 'ps-3', authorSlug: 'owen-brooks', createdAt: '2026-03-14T16:48:00.000Z', content: 'Ours is a tiny pre-ship checklist tied to one onboarding metric. Boring, but it works.' },
      { slug: 'ps-4', authorSlug: 'jules-hart', createdAt: '2026-03-14T16:52:00.000Z', content: 'The short brief is the important part. The moment it turns into a doc nobody reads, it stops helping.' },
      { slug: 'ps-5', authorSlug: 'nina-patel', createdAt: '2026-03-14T16:58:00.000Z', content: 'We started writing down what is explicitly out of scope for the launch. That killed a lot of last-minute thrash.' },
      { slug: 'ps-6', authorSlug: 'diego-romero', createdAt: '2026-03-14T17:04:00.000Z', content: 'For AI stuff, we also add “how will we know it is failing?” before anyone debates UX.' },
      { slug: 'ps-7', authorSlug: 'samir-khan', createdAt: '2026-03-14T17:12:00.000Z', content: 'This is exactly the kind of thing people ask about in office hours too.' },
      { slug: 'ps-8', authorSlug: 'priya-mehta', createdAt: '2026-03-14T17:16:00.000Z', content: 'We make teams write the rollback plan up front now. Weirdly, it improves the product conversation too.' },
    ],
  },
  {
    slug: 'ai-evals-templates',
    authorSlug: 'diego-romero',
    circleSlug: 'ai-builders',
    createdAt: '2026-03-14T14:10:00.000Z',
    content: 'I tossed our lightweight eval template for retrieval features into the docs.\n\nIt is very unglamorous, but it catches the “looked great in demo, fell apart with real users” stuff earlier than our old process did.',
    comments: [
      { slug: 'ai-1', authorSlug: 'maya-chen', createdAt: '2026-03-14T14:16:00.000Z', content: 'The failure examples are the useful part. Most templates jump straight to “happy path” outputs.' },
      { slug: 'ai-2', authorSlug: 'nina-patel', createdAt: '2026-03-14T14:25:00.000Z', content: 'If you ever make a founder-sized version of this, I will absolutely steal it.' },
      { slug: 'ai-3', authorSlug: 'priya-mehta', createdAt: '2026-03-14T14:31:00.000Z', content: 'Glad you left the latency notes in. Half of these conversations are infra conversations now.' },
      { slug: 'ai-4', authorSlug: 'samir-khan', createdAt: '2026-03-14T14:42:00.000Z', content: 'This would make a good live teardown session, honestly.' },
    ],
  },
  {
    slug: 'incident-review-prompts',
    authorSlug: 'erin-oliver',
    circleSlug: 'platform-ops',
    createdAt: '2026-03-13T19:40:00.000Z',
    content: 'Sharing the three prompts we use in incident reviews so we do not end up with another vague “improve monitoring” follow-up:\n1. What assumption turned out to be wrong?\n2. What signal showed up too late?\n3. What would have made rollback the obvious move sooner?',
    comments: [
      { slug: 'ops-1', authorSlug: 'lucia-mora', createdAt: '2026-03-13T19:55:00.000Z', content: 'These work really well for security retros too, especially the second one.' },
      { slug: 'ops-2', authorSlug: 'priya-mehta', createdAt: '2026-03-13T20:07:00.000Z', content: 'We also ask “would this have reduced confusion in the first 10 minutes?” It cleaned up our action items fast.' },
      { slug: 'ops-3', authorSlug: 'haruto-sato', createdAt: '2026-03-13T20:19:00.000Z', content: 'More product teams should sit in on these. A lot of failed assumptions start long before the pager.' },
    ],
  },
  {
    slug: 'community-reporting-stack',
    authorSlug: 'talia-ng',
    circleSlug: 'community-led-growth',
    createdAt: '2026-03-13T17:15:00.000Z',
    content: 'What community metric actually got leadership to make a different decision this year?\n\nNot “look how many people joined.” I mean the one number that made someone approve budget, headcount, or a bigger program.',
    comments: [
      { slug: 'clg-1', authorSlug: 'samir-khan', createdAt: '2026-03-13T17:28:00.000Z', content: 'Repeat contributors. It finally gave us a way to talk about depth instead of just reach.' },
      { slug: 'clg-2', authorSlug: 'jules-hart', createdAt: '2026-03-13T17:36:00.000Z', content: 'Launch influence. Once we tied community touchpoints to pipeline, people paid attention fast.' },
      { slug: 'clg-3', authorSlug: 'nina-patel', createdAt: '2026-03-13T17:51:00.000Z', content: 'For a smaller team, it has been warm intros. Simple, but it is the metric people actually remember.' },
    ],
  },
  {
    slug: 'founder-customer-dinners',
    authorSlug: 'nina-patel',
    circleSlug: 'founder-signal',
    createdAt: '2026-03-12T21:10:00.000Z',
    content: 'We swapped one webinar for a 12-person customer dinner and got way better signal.\n\nCurious how other people decide when a small room beats a scalable format.',
    comments: [
      { slug: 'fs-1', authorSlug: 'maya-chen', createdAt: '2026-03-12T21:26:00.000Z', content: 'If you need language, not volume, I would pick the smaller room every time.' },
      { slug: 'fs-2', authorSlug: 'jules-hart', createdAt: '2026-03-12T21:33:00.000Z', content: 'We use dinners to sharpen the message and webinars to amplify it. Different jobs.' },
      { slug: 'fs-3', authorSlug: 'diego-romero', createdAt: '2026-03-12T21:48:00.000Z', content: 'You also get the awkward nuance that never shows up in surveys, which is usually the useful part.' },
    ],
  },
  {
    slug: 'mobile-onboarding-kpis',
    authorSlug: 'owen-brooks',
    circleSlug: 'product-systems',
    createdAt: '2026-03-12T18:45:00.000Z',
    content: 'I am trying to replace our vague “time to value” dashboard with one onboarding metric the whole team can actually argue around.\n\nIf you had to pick just one, what would it be?',
    comments: [
      { slug: 'mob-1', authorSlug: 'maya-chen', createdAt: '2026-03-12T18:58:00.000Z', content: 'First completed outcome, not first clicked thing. That distinction matters a lot.' },
      { slug: 'mob-2', authorSlug: 'amal-nasser', createdAt: '2026-03-12T19:06:00.000Z', content: 'We pair ours with a simple support log so the number has some context.' },
    ],
  },
  {
    slug: 'devrel-office-hours',
    authorSlug: 'samir-khan',
    circleSlug: 'community-led-growth',
    createdAt: '2026-03-11T15:20:00.000Z',
    content: 'Hosting office hours with a couple of engineering leads next week.\n\nIf you have a format that consistently leads to better follow-up conversations, send it my way.',
    comments: [
      { slug: 'dr-1', authorSlug: 'talia-ng', createdAt: '2026-03-11T15:35:00.000Z', content: 'Small topic tables beat one giant AMA every time for us.' },
    ],
  },
  {
    slug: 'security-defaults-story',
    authorSlug: 'lucia-mora',
    circleSlug: 'platform-ops',
    createdAt: '2026-03-11T12:05:00.000Z',
    content: 'Secure defaults are a product design choice as much as a security choice.\n\nThe fastest teams I have seen usually give people fewer ways to make the dangerous decision.',
    comments: [
      { slug: 'sec-1', authorSlug: 'erin-oliver', createdAt: '2026-03-11T12:17:00.000Z', content: 'Yep. Fewer bad options usually beats another page of documentation.' },
      { slug: 'sec-2', authorSlug: 'priya-mehta', createdAt: '2026-03-11T12:29:00.000Z', content: 'Platform teams need this reminder just as much as product teams do.' },
    ],
  },
  {
    slug: 'frontend-collaboration-map',
    authorSlug: 'haruto-sato',
    circleSlug: 'product-systems',
    createdAt: '2026-03-10T17:30:00.000Z',
    content: 'I mapped where design, content, and frontend handoffs actually fall apart instead of where our process doc says they do.\n\nThe map is ugly, but it is way more useful than the official version.',
    comments: [
      { slug: 'fe-1', authorSlug: 'amal-nasser', createdAt: '2026-03-10T17:42:00.000Z', content: 'The ugly maps are always the honest ones.' },
      { slug: 'fe-2', authorSlug: 'maya-chen', createdAt: '2026-03-10T17:59:00.000Z', content: 'Would love to see how you separated “nobody owns this” from plain old delay.' },
    ],
  },
  {
    slug: 'cloud-cost-conversations',
    authorSlug: 'priya-mehta',
    circleSlug: 'platform-ops',
    createdAt: '2026-03-10T14:40:00.000Z',
    content: 'Cloud cost conversations get a lot easier once product teams can see the tradeoff in plain language: latency, resilience, or spend.\n\nA nice dashboard by itself rarely changes behavior.',
    comments: [
      { slug: 'cloud-1', authorSlug: 'erin-oliver', createdAt: '2026-03-10T14:51:00.000Z', content: 'Exactly. The dashboard has to map to a product choice or nobody cares.' },
      { slug: 'cloud-2', authorSlug: 'diego-romero', createdAt: '2026-03-10T15:02:00.000Z', content: 'Same on the AI side. Cost only clicked when we tied it to latency and answer quality.' },
    ],
  },
  {
    slug: 'launch-cohort-invites',
    authorSlug: 'jules-hart',
    circleSlug: 'community-led-growth',
    createdAt: '2026-03-09T13:55:00.000Z',
    content: 'We tested invite cohorts for launch week instead of blasting everyone at once.\n\nThe follow-up conversations got much better because we could adjust the message between waves.',
    comments: [
      { slug: 'launch-1', authorSlug: 'samir-khan', createdAt: '2026-03-09T14:09:00.000Z', content: 'It also gives the community team room to learn between sends instead of guessing once.' },
      { slug: 'launch-2', authorSlug: 'nina-patel', createdAt: '2026-03-09T14:18:00.000Z', content: 'We did this with beta invites and the follow-ups felt way more human.' },
    ],
  },
  {
    slug: 'career-clarity-signals',
    authorSlug: 'amal-nasser',
    circleSlug: 'product-systems',
    createdAt: '2026-03-08T18:10:00.000Z',
    content: 'For people leading systems work: what tells you someone is ready for more cross-functional scope before their title catches up?',
    comments: [
      { slug: 'career-1', authorSlug: 'haruto-sato', createdAt: '2026-03-08T18:26:00.000Z', content: 'They start removing ambiguity for everyone else without being asked.' },
      { slug: 'career-2', authorSlug: 'maya-chen', createdAt: '2026-03-08T18:40:00.000Z', content: 'They talk in tradeoffs, not just tasks.' },
    ],
  },
  {
    slug: 'ai-team-ops',
    authorSlug: 'diego-romero',
    circleSlug: 'ai-builders',
    createdAt: '2026-03-08T11:45:00.000Z',
    content: 'How are teams handling AI product reviews right now?\n\nAre you doing a separate eval review first, or folding that into the normal product review?',
    comments: [
      { slug: 'aiops-1', authorSlug: 'maya-chen', createdAt: '2026-03-08T11:58:00.000Z', content: 'Separate eval review first, otherwise the UX conversation eats the whole meeting.' },
      { slug: 'aiops-2', authorSlug: 'priya-mehta', createdAt: '2026-03-08T12:11:00.000Z', content: 'We pair infra readiness with eval, then do product review after that.' },
    ],
  },
  {
    slug: 'community-systems-templates',
    authorSlug: 'talia-ng',
    circleSlug: 'community-led-growth',
    createdAt: '2026-03-07T16:00:00.000Z',
    content: 'Dropped our member onboarding templates into the docs.\n\nThe first-30-days sequence finally helped us get volunteer churn under control, so sharing in case it is useful to anyone else.',
    comments: [
      { slug: 'cs-1', authorSlug: 'samir-khan', createdAt: '2026-03-07T16:12:00.000Z', content: 'The volunteer handoff section alone is worth stealing.' },
    ],
  },
  {
    slug: 'founder-reading-room',
    authorSlug: 'nina-patel',
    circleSlug: 'founder-signal',
    createdAt: '2026-03-07T10:20:00.000Z',
    content: 'Starting a tiny founder reading room around product narrative and team communication.\n\nReply if you want in before we cap it at 10.',
    comments: [
      { slug: 'fr-1', authorSlug: 'jules-hart', createdAt: '2026-03-07T10:32:00.000Z', content: 'I am in if marketing-adjacent observers are allowed.' },
      { slug: 'fr-2', authorSlug: 'maya-chen', createdAt: '2026-03-07T10:46:00.000Z', content: 'I would join for the narrative teardown alone.' },
    ],
  },
];

const SHOWCASE_EVENTS: ShowcaseEventDefinition[] = [
  {
    slug: 'operator-dinner-sf',
    title: 'Operator Dinner: Product Systems in Practice',
    description: 'A small dinner for product engineers, design systems leads, and platform operators comparing launch rituals that actually reduce chaos.',
    startTime: '2026-04-09T01:00:00.000Z',
    endTime: '2026-04-09T03:30:00.000Z',
    location: 'San Francisco, CA',
    eventFormat: 'In-person',
    pricingType: 'Paid',
    attendeeCount: 48,
    bookmarkedBy: ['maya-chen', 'amal-nasser', 'haruto-sato'],
    attendingBy: ['maya-chen', 'amal-nasser', 'haruto-sato'],
  },
  {
    slug: 'applied-ai-signal-forum',
    title: 'Applied AI Signal Forum',
    description: 'Practical sessions on evaluation loops, agent UX, and shipping AI features that survive contact with production.',
    startTime: '2026-04-16T16:00:00.000Z',
    endTime: '2026-04-16T22:00:00.000Z',
    location: 'Austin, TX',
    eventFormat: 'Hybrid',
    pricingType: 'Paid',
    attendeeCount: 320,
    bookmarkedBy: ['diego-romero', 'priya-mehta', 'nina-patel'],
    attendingBy: ['diego-romero', 'priya-mehta'],
  },
  {
    slug: 'community-ops-roundtable',
    title: 'Community Ops Roundtable',
    description: 'An operator-heavy meetup for people building repeatable member programs, office hours, ambassador systems, and event follow-up loops.',
    startTime: '2026-04-23T18:30:00.000Z',
    endTime: '2026-04-23T20:30:00.000Z',
    location: 'Chicago, IL',
    eventFormat: 'In-person',
    pricingType: 'Free',
    attendeeCount: 95,
    bookmarkedBy: ['samir-khan', 'talia-ng', 'jules-hart'],
    attendingBy: ['samir-khan', 'talia-ng'],
  },
  {
    slug: 'platform-clarity-summit',
    title: 'Platform Clarity Summit',
    description: 'Reliability, FinOps, security defaults, and platform product thinking for teams tired of abstract ops advice.',
    startTime: '2026-05-05T15:00:00.000Z',
    endTime: '2026-05-05T23:00:00.000Z',
    location: 'Seattle, WA',
    eventFormat: 'Hybrid',
    pricingType: 'Paid',
    attendeeCount: 410,
    bookmarkedBy: ['erin-oliver', 'lucia-mora', 'priya-mehta'],
    attendingBy: ['erin-oliver', 'priya-mehta'],
  },
  {
    slug: 'founder-signal-breakfast',
    title: 'Founder Signal Breakfast',
    description: 'A curated founder breakfast on customer dinners, early narrative, and keeping community efforts tied to product decisions.',
    startTime: '2026-05-12T15:30:00.000Z',
    endTime: '2026-05-12T17:00:00.000Z',
    location: 'Toronto, ON',
    eventFormat: 'In-person',
    pricingType: 'Paid',
    attendeeCount: 60,
    bookmarkedBy: ['nina-patel', 'jules-hart', 'maya-chen'],
    attendingBy: ['nina-patel', 'jules-hart'],
  },
  {
    slug: 'frontend-craft-lab',
    title: 'Frontend Craft Lab',
    description: 'A hands-on workshop on design-engineering collaboration, interaction polish, and performance tradeoffs in product systems.',
    startTime: '2026-05-20T17:00:00.000Z',
    endTime: '2026-05-20T21:00:00.000Z',
    location: 'Portland, OR',
    eventFormat: 'In-person',
    pricingType: 'Paid',
    attendeeCount: 140,
    bookmarkedBy: ['haruto-sato', 'amal-nasser', 'owen-brooks'],
    attendingBy: ['haruto-sato', 'owen-brooks'],
  },
  {
    slug: 'remote-community-systems',
    title: 'Remote Community Systems Webinar',
    description: 'A live session for community leads building rituals, volunteer systems, and follow-up mechanics that survive remote-first teams.',
    startTime: '2026-06-03T18:00:00.000Z',
    endTime: '2026-06-03T19:30:00.000Z',
    location: 'Virtual',
    eventFormat: 'Online',
    pricingType: 'Free',
    attendeeCount: 540,
    bookmarkedBy: ['talia-ng', 'samir-khan', 'jules-hart'],
    attendingBy: ['talia-ng', 'samir-khan', 'jules-hart'],
  },
];

function namespacedId(prefix: string, slug: string): string {
  return uuidv5(`${prefix}:${slug}`, SHOWCASE_UUID_NAMESPACE);
}

function circleId(slug: string): string {
  return namespacedId(SHOWCASE_CIRCLE_PREFIX, slug);
}

function postId(slug: string): string {
  return namespacedId(SHOWCASE_POST_PREFIX, slug);
}

function commentId(postSlug: string, commentSlug: string): string {
  return namespacedId(SHOWCASE_COMMENT_PREFIX, `${postSlug}-${commentSlug}`);
}

function eventId(slug: string): string {
  return namespacedId(SHOWCASE_EVENT_PREFIX, slug);
}

function userEventId(eventSlug: string, profileSlug: string): string {
  return namespacedId(SHOWCASE_USER_EVENT_PREFIX, `${eventSlug}-${profileSlug}`);
}

function buildSkillTags(skills: string[], interests: string[]) {
  return {
    showcase: true,
    namespace: SHOWCASE_NAMESPACE,
    highlightedSkills: skills,
    highlightedInterests: interests,
  };
}

function showcaseEmail(slug: string): string {
  return `${SHOWCASE_NAMESPACE}+${slug}@kurecal.dev`;
}

function requireProfileId(
  slug: string,
  profileIdsBySlug: Record<string, string>
): string {
  const value = profileIdsBySlug[slug];
  if (!value) {
    throw new Error(`Missing Community showcase auth/profile id for "${slug}".`);
  }

  return value;
}

async function listShowcaseAuthUsers(
  supabase: SupabaseClientType
): Promise<Map<string, string>> {
  const targetEmails = new Set(
    SHOWCASE_PROFILES.map((profile) => showcaseEmail(profile.slug))
  );
  const authUsers = new Map<string, string>();
  let page = 1;
  const perPage = 200;

  while (authUsers.size < targetEmails.size) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw new Error(`Failed to list auth users: ${error.message}`);
    }

    const users = data.users ?? [];
    if (users.length === 0) {
      break;
    }

    users.forEach((user) => {
      const email = user.email ?? '';
      if (targetEmails.has(email)) {
        authUsers.set(email, user.id);
      }
    });

    if (users.length < perPage) {
      break;
    }

    page += 1;
  }

  return authUsers;
}

export async function ensureCommunityShowcaseAuthUsers(
  supabase: SupabaseClientType
): Promise<Record<string, string>> {
  const existingUsers = await listShowcaseAuthUsers(supabase);
  const profileIdsBySlug: Record<string, string> = {};

  for (const profile of SHOWCASE_PROFILES) {
    const email = showcaseEmail(profile.slug);
    const existingId = existingUsers.get(email);

    if (existingId) {
      profileIdsBySlug[profile.slug] = existingId;
      continue;
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: `${randomUUID()}Aa!9`,
      email_confirm: true,
      user_metadata: {
        full_name: profile.fullName,
        showcase: true,
        namespace: SHOWCASE_NAMESPACE,
      },
      app_metadata: {
        showcase: true,
        namespace: SHOWCASE_NAMESPACE,
      },
    });

    if (error || !data.user?.id) {
      throw new Error(
        `Failed to create auth user for ${profile.slug}: ${error?.message ?? 'Unknown error'}`
      );
    }

    profileIdsBySlug[profile.slug] = data.user.id;
  }

  return profileIdsBySlug;
}

async function getExistingShowcaseProfileIds(
  supabase: SupabaseClientType
): Promise<Record<string, string>> {
  const usernames = SHOWCASE_PROFILES.map((profile) => profile.username);
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username')
    .in('username', usernames);

  if (error) {
    throw new Error(`Failed to fetch existing showcase profiles: ${error.message}`);
  }

  const profileIdsBySlug: Record<string, string> = {};
  (data || []).forEach((profile) => {
    const definition = SHOWCASE_PROFILES.find(
      (candidate) => candidate.username === profile.username
    );

    if (definition) {
      profileIdsBySlug[definition.slug] = profile.id;
    }
  });

  return profileIdsBySlug;
}

export async function clearCommunityShowcaseAuthUsers(
  supabase: SupabaseClientType
): Promise<number> {
  const authUsers = await listShowcaseAuthUsers(supabase);
  let deleted = 0;

  for (const userId of authUsers.values()) {
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) {
      throw new Error(`Failed to delete Community showcase auth user: ${error.message}`);
    }

    deleted += 1;
  }

  return deleted;
}

export function createCommunityShowcaseDataset(
  profileIdsBySlug: Record<string, string>
): ShowcaseDataset {
  const profiles: ProfileInsert[] = SHOWCASE_PROFILES.map((profile) => ({
    id: requireProfileId(profile.slug, profileIdsBySlug),
    full_name: profile.fullName,
    username: profile.username,
    headline: profile.headline,
    location: profile.location,
    avatar_url: profile.avatarUrl,
    created_at: profile.createdAt,
    updated_at: SHOWCASE_UPDATED_AT,
    profile_visibility: 'public',
    show_attendance: profile.showAttendance,
    preferences: {
      showcase: true,
      namespace: SHOWCASE_NAMESPACE,
      seededAt: SHOWCASE_UPDATED_AT,
    },
  }));

  const userSocialStats: UserSocialStatsInsert[] = SHOWCASE_PROFILES.map((profile) => ({
    user_id: requireProfileId(profile.slug, profileIdsBySlug),
    follower_count: profile.followerCount,
    following_count: profile.followingCount,
    updated_at: SHOWCASE_UPDATED_AT,
  }));

  const careerProfiles: CareerProfileInsert[] = SHOWCASE_PROFILES.map((profile) => ({
    user_id: requireProfileId(profile.slug, profileIdsBySlug),
    current_role: profile.career.currentRole,
    seniority: profile.career.seniority,
    industry: profile.career.industry,
    company_size: profile.career.companySize,
    primary_skills: profile.career.primarySkills,
    skills_to_learn: profile.career.skillsToLearn,
    interests: profile.career.interests,
    career_goals: profile.career.careerGoals,
    timeframe: profile.career.timeframe,
    target_path: profile.career.targetPath,
    learning_style: profile.career.learningStyle,
    networking_goals: profile.career.networkingGoals,
    preferred_event_types: profile.career.preferredEventTypes,
    available_time: profile.career.availableTime,
    budget: profile.career.budget,
    skill_tags: buildSkillTags(profile.career.primarySkills, profile.career.interests),
    created_at: profile.createdAt,
    updated_at: SHOWCASE_UPDATED_AT,
  }));

  const circles: CircleInsert[] = SHOWCASE_CIRCLES.map((circle) => ({
    id: circleId(circle.slug),
    slug: circle.slug,
    name: circle.name,
    description: circle.description,
    href: `/circle/${circle.slug}`,
    member_count: circle.memberCount,
    created_at: SHOWCASE_UPDATED_AT,
  }));

  const circleMembers: CircleMemberInsert[] = SHOWCASE_CIRCLES.flatMap((circle) =>
    circle.members.map((memberSlug) => ({
      circle_id: circleId(circle.slug),
      user_id: requireProfileId(memberSlug, profileIdsBySlug),
      created_at: SHOWCASE_UPDATED_AT,
    }))
  );

  const circlePosts: CirclePostInsert[] = SHOWCASE_POSTS.map((post) => ({
    id: postId(post.slug),
    author_id: requireProfileId(post.authorSlug, profileIdsBySlug),
    circle_id: circleId(post.circleSlug),
    content: post.content,
    created_at: post.createdAt,
    updated_at: post.createdAt,
  }));

  const circleComments: CircleCommentInsert[] = SHOWCASE_POSTS.flatMap((post) =>
    post.comments.map((comment) => ({
      id: commentId(post.slug, comment.slug),
      post_id: postId(post.slug),
      author_id: requireProfileId(comment.authorSlug, profileIdsBySlug),
      content: comment.content,
      parent_id: null,
      created_at: comment.createdAt,
      updated_at: comment.createdAt,
    }))
  );

  const events: EventInsert[] = SHOWCASE_EVENTS.map((event) => ({
    id: eventId(event.slug),
    slug: event.slug,
    title: event.title,
    description: event.description,
    start_time: event.startTime,
    end_time: event.endTime,
    location: event.location,
    event_format: event.eventFormat,
    pricing_type: event.pricingType,
    attendee_count: event.attendeeCount,
    status: SHOWCASE_EVENT_STATUS_LOWERCASE,
    status_enum: SHOWCASE_EVENT_STATUS,
    timezone: DEFAULT_TIMEZONE,
    source_url: `https://showcase.kurecal.local/events/${event.slug}`,
    source_domain: 'showcase.kurecal.local',
    created_at: SHOWCASE_UPDATED_AT,
    updated_at: SHOWCASE_UPDATED_AT,
  }));

  const userEvents: UserEventInsert[] = SHOWCASE_EVENTS.flatMap((event) => {
    const bookmarked = event.bookmarkedBy.map((profileSlug) => ({
      id: userEventId(event.slug, profileSlug),
      user_id: requireProfileId(profileSlug, profileIdsBySlug),
      event_id: eventId(event.slug),
      is_bookmarked: true,
      bookmarked_at: SHOWCASE_UPDATED_AT,
      status: event.attendingBy.includes(profileSlug) ? 'attending' : null,
      created_at: SHOWCASE_UPDATED_AT,
      updated_at: SHOWCASE_UPDATED_AT,
      discovery_source: SHOWCASE_NAMESPACE,
      recommendation_context: {
        showcase: true,
        namespace: SHOWCASE_NAMESPACE,
        eventSlug: event.slug,
      },
    }));

    return bookmarked;
  });

  return {
    profiles,
    userSocialStats,
    careerProfiles,
    circles,
    circleMembers,
    circlePosts,
    circleComments,
    events,
    userEvents,
    ids: {
      profileIds: profiles.map((profile) => profile.id as string),
      circleIds: circles.map((circle) => circle.id as string),
      postIds: circlePosts.map((post) => post.id as string),
      commentIds: circleComments.map((comment) => comment.id as string),
      eventIds: events.map((event) => event.id as string),
      userEventIds: userEvents.map((userEvent) => userEvent.id as string),
    },
  };
}

export function createShowcaseClient(): SupabaseClientType {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing required environment variables:');
    console.error(`- NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? 'set' : 'missing'}`);
    console.error(`- SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? 'set' : 'missing'}`);
    process.exit(1);
  }

  return createServiceClient(supabaseUrl, supabaseServiceKey);
}

export async function verifyCommunityShowcaseTables(
  supabase: SupabaseClientType
): Promise<void> {
  const checks: Array<{
    table: keyof Database['public']['Tables'];
    column: string;
  }> = [
    { table: 'profiles', column: 'id' },
    { table: 'career_profiles', column: 'user_id' },
    { table: 'user_social_stats', column: 'user_id' },
    { table: 'circles', column: 'id' },
    { table: 'circle_members', column: 'user_id' },
    { table: 'circle_posts', column: 'id' },
    { table: 'circle_comments', column: 'id' },
    { table: 'events', column: 'id' },
    { table: 'user_events', column: 'id' },
  ];

  for (const check of checks) {
    const { error } = await supabase.from(check.table).select(check.column).limit(1);
    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to access ${check.table}: ${error.message}`);
    }
  }
}

export interface CommunityShowcaseSummary {
  deleted: Record<string, number>;
  inserted: Record<string, number>;
}

export async function clearCommunityShowcaseData(
  supabase: SupabaseClientType
): Promise<Record<string, number>> {
  const profileIdsBySlug = await getExistingShowcaseProfileIds(supabase);
  const existingProfileIds = Object.values(profileIdsBySlug);
  const fallbackProfileIds = Object.fromEntries(
    SHOWCASE_PROFILES.map((profile) => [
      profile.slug,
      namespacedId('community-showcase-placeholder-profile', profile.slug),
    ])
  );
  const dataset = createCommunityShowcaseDataset(
    existingProfileIds.length > 0 ? profileIdsBySlug : fallbackProfileIds
  );

  const countDelete = async (
    label: string,
    query: PromiseLike<{ error: { message: string } | null }>
  ) => {
    const { error } = await query;
    if (error) {
      throw new Error(`Failed to delete ${label}: ${error.message}`);
    }
  };

  await countDelete(
    'circle comments',
    supabase.from('circle_comments').delete().in('id', dataset.ids.commentIds)
  );
  await countDelete(
    'circle posts',
    supabase.from('circle_posts').delete().in('id', dataset.ids.postIds)
  );
  await countDelete(
    'circle memberships',
    supabase.from('circle_members').delete().in('circle_id', dataset.ids.circleIds)
  );
  await countDelete(
    'user events',
    supabase.from('user_events').delete().in('event_id', dataset.ids.eventIds)
  );
  if (existingProfileIds.length > 0) {
    await countDelete(
      'user social stats',
      supabase.from('user_social_stats').delete().in('user_id', existingProfileIds)
    );
    await countDelete(
      'career profiles',
      supabase.from('career_profiles').delete().in('user_id', existingProfileIds)
    );
    await countDelete(
      'profiles',
      supabase.from('profiles').delete().in('id', existingProfileIds)
    );
  }
  await countDelete(
    'circles',
    supabase.from('circles').delete().in('id', dataset.ids.circleIds)
  );
  await countDelete(
    'events',
    supabase.from('events').delete().in('id', dataset.ids.eventIds)
  );
  const deletedAuthUsers = await clearCommunityShowcaseAuthUsers(supabase);

  return {
    circle_comments: dataset.ids.commentIds.length,
    circle_posts: dataset.ids.postIds.length,
    circle_members: dataset.circleMembers.length,
    user_events: dataset.ids.userEventIds.length,
    user_social_stats: existingProfileIds.length,
    career_profiles: existingProfileIds.length,
    profiles: existingProfileIds.length,
    circles: dataset.ids.circleIds.length,
    events: dataset.ids.eventIds.length,
    auth_users: deletedAuthUsers,
  };
}

export function printSummary(
  title: string,
  summary: Record<string, number>
): void {
  console.log(`\n${title}`);
  Object.entries(summary).forEach(([key, value]) => {
    console.log(`- ${key}: ${value}`);
  });
}
