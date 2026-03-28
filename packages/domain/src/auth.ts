import { z } from 'zod';

export const OAUTH_PROVIDERS = {
  GOOGLE: 'google',
  GITHUB: 'github',
  APPLE: 'apple',
} as const;

export const oauthProviderSchema = z.enum([
  OAUTH_PROVIDERS.GOOGLE,
  OAUTH_PROVIDERS.GITHUB,
  OAUTH_PROVIDERS.APPLE,
]);
export type OAuthProvider = z.infer<typeof oauthProviderSchema>;

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const signUpSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
  acceptTerms: z.boolean(),
});

export const appProfileSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().nullable(),
  avatarUrl: z.string().url().nullable().optional(),
  timezone: z.string().nullable(),
  preferences: z.record(z.string(), z.unknown()).nullable().optional(),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
});

export const blockedUserSummarySchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  username: z.string().nullable(),
  headline: z.string().nullable(),
  blockedAt: z.string(),
});

export type AppProfile = z.infer<typeof appProfileSchema>;
export type BlockedUserSummary = z.infer<typeof blockedUserSummarySchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
