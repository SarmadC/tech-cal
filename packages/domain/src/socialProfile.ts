import { z } from 'zod';

export const profileVisibilityValues = [
  'private',
  'connections',
  'public',
] as const;

export const profileVisibilitySchema = z.enum(profileVisibilityValues);

export type ProfileVisibility = z.infer<typeof profileVisibilitySchema>;

export const socialProfileSchema = z.object({
  id: z.string(),
  fullName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  username: z.string().nullable(),
  headline: z.string().nullable(),
  bio: z.string().nullable(),
  profileVisibility: profileVisibilitySchema,
  showAttendance: z.boolean(),
});

export type SocialProfile = z.infer<typeof socialProfileSchema>;

export const socialProfileUpdateSchema = z.object({
  username: z.string().trim().max(30).nullable().optional(),
  headline: z.string().trim().max(120).nullable().optional(),
  bio: z.string().trim().max(220).nullable().optional(),
  profileVisibility: profileVisibilitySchema.optional(),
  showAttendance: z.boolean().optional(),
});

export type SocialProfileUpdateInput = z.infer<typeof socialProfileUpdateSchema>;

export const usernameAvailabilityReasonSchema = z.enum([
  'taken',
  'invalid',
  'reserved',
]);

export type UsernameAvailabilityReason = z.infer<
  typeof usernameAvailabilityReasonSchema
>;

export const usernameAvailabilityResultSchema = z.object({
  username: z.string(),
  available: z.boolean(),
  reason: usernameAvailabilityReasonSchema.optional(),
  message: z.string(),
});

export type UsernameAvailabilityResult = z.infer<
  typeof usernameAvailabilityResultSchema
>;

export const USERNAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]{2,29}$/;

export const RESERVED_USERNAMES = [
  'admin',
  'api',
  'about',
  'blog',
  'calendar',
  'community',
  'circles',
  'contact',
  'dashboard',
  'discover',
  'events',
  'feed',
  'login',
  'logout',
  'pricing',
  'settings',
  'signup',
  'u',
  'user',
  'users',
  'null',
  'undefined',
] as const;

const RESERVED_USERNAME_SET = new Set<string>(RESERVED_USERNAMES);

export function normalizeUsername(input: string): string {
  return input.trim();
}

export function escapeLikePattern(input: string): string {
  return input.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

export function isReservedUsername(username: string): boolean {
  return RESERVED_USERNAME_SET.has(username.toLowerCase());
}

export function isValidUsernameFormat(username: string): boolean {
  return USERNAME_PATTERN.test(username);
}
