/**
 * Test mock types and utilities
 * Consolidates common mock types used across test files
 */

// Mock query builder type for testing
export interface MockQueryBuilder {
  eq: (column: string, value: unknown) => MockQueryBuilder;
  neq: (column: string, value: unknown) => MockQueryBuilder;
  gt: (column: string, value: unknown) => MockQueryBuilder;
  gte: (column: string, value: unknown) => MockQueryBuilder;
  lt: (column: string, value: unknown) => MockQueryBuilder;
  lte: (column: string, value: unknown) => MockQueryBuilder;
  like: (column: string, value: string) => MockQueryBuilder;
  ilike: (column: string, value: string) => MockQueryBuilder;
  in: (column: string, values: unknown[]) => MockQueryBuilder;
  is: (column: string, value: string) => MockQueryBuilder;
  or: (condition: string) => MockQueryBuilder;
  and: (condition: string) => MockQueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => MockQueryBuilder;
  limit: (count: number) => MockQueryBuilder;
  range: (from: number, to: number) => MockQueryBuilder;
  select: (columns?: string) => MockQueryBuilder;
  single: () => Promise<{ data: unknown; error: unknown }>;
  then: (resolve: (value: unknown) => void) => Promise<unknown>;
}

// Mock Supabase client type for testing
export interface MockSupabaseClient {
  from: (table: string) => MockQueryBuilder;
  rpc: (functionName: string, params?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  auth: {
    getUser: () => Promise<{ data: { user: { id: string } | null }; error: unknown }>;
  };
}

// Mock event type for testing
export interface MockEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  location?: string;
  category?: { name: string };
  tags?: Array<{ name: string; category: string }>;
  priceMin?: number | null;
  priceMax?: number | null;
  currency?: string | null;
  attendeeCount?: number;
  livestreamUrl?: string;
  venueId?: string;
  isMultiDay?: boolean;
  dailySchedule?: unknown;
}

// Mock career profile type for testing
export interface MockCareerProfile {
  userId: string;
  primarySkills: string[];
  skillsToLearn: string[];
  seniority: string;
  careerGoals: string[];
  industry: string;
  learningStyle: string;
  timeframe: string;
  budget: string;
  networkingGoals: string[];
  preferredEventTypes: string[];
}

// Mock scoring strategy type for testing
export interface MockScoringStrategy {
  version: string;
  name: string;
  calculate: (input: { event: MockEvent; careerProfile: MockCareerProfile }) => Promise<{
    overall: number;
    confidence: number;
    components: Record<string, number>;
    explanation: { reasons: string[] };
    metadata: { scoringTriggers?: string[] };
  }>;
}

// Utility function to create mock query builder
export function createMockQueryBuilder(): MockQueryBuilder {
  const builder = {
    eq: (_column: string, _value: unknown) => builder,
    neq: (_column: string, _value: unknown) => builder,
    gt: (_column: string, _value: unknown) => builder,
    gte: (_column: string, _value: unknown) => builder,
    lt: (_column: string, _value: unknown) => builder,
    lte: (_column: string, _value: unknown) => builder,
    like: (_column: string, _value: string) => builder,
    ilike: (_column: string, _value: string) => builder,
    in: (_column: string, _values: unknown[]) => builder,
    is: (_column: string, _value: string) => builder,
    or: (_condition: string) => builder,
    and: (_condition: string) => builder,
    order: (_column: string, _options?: { ascending?: boolean }) => builder,
    limit: (_count: number) => builder,
    range: (_from: number, _to: number) => builder,
    select: (_columns?: string) => builder,
    single: () => Promise.resolve({ data: null, error: null }),
    then: (resolve: (value: unknown) => void) => Promise.resolve(resolve({ data: [], error: null }))
  };
  return builder;
}

// Utility function to create mock Supabase client
export function createMockSupabaseClient(): MockSupabaseClient {
  return {
    from: () => createMockQueryBuilder(),
    rpc: () => Promise.resolve({ data: [], error: null }),
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: 'test-user' } }, error: null })
    }
  };
}
