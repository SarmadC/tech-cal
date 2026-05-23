import {
  escapeLikePattern as escapeDomainLikePattern,
  isReservedUsername as isReservedDomainUsername,
  isValidUsernameFormat as isValidDomainUsernameFormat,
  normalizeUsername as normalizeDomainUsername,
  type ProfileVisibility,
  type SocialProfile,
  type SocialProfileUpdateInput,
  type UsernameAvailabilityReason,
  type UsernameAvailabilityResult,
} from '@kurecal/domain';

import type { SupabaseClientType } from '@/types';

export type {
  ProfileVisibility,
  SocialProfile,
  SocialProfileUpdateInput,
  UsernameAvailabilityReason,
  UsernameAvailabilityResult,
};

type SocialProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
  headline: string | null;
  bio: string | null;
  profile_visibility: string;
  show_attendance: boolean;
};

export class SocialProfileService {
  static normalizeUsername(input: string): string {
    return normalizeDomainUsername(input);
  }

  static escapeLikePattern(input: string): string {
    return escapeDomainLikePattern(input);
  }

  static isReservedUsername(username: string): boolean {
    return isReservedDomainUsername(username);
  }

  static isValidUsernameFormat(username: string): boolean {
    return isValidDomainUsernameFormat(username);
  }

  static mapSocialProfile(row: SocialProfileRow): SocialProfile {
    const visibility: ProfileVisibility =
      row.profile_visibility === 'public' || row.profile_visibility === 'connections'
        ? row.profile_visibility
        : 'private';

    return {
      id: row.id,
      fullName: row.full_name,
      avatarUrl: row.avatar_url,
      username: row.username,
      headline: row.headline,
      bio: row.bio,
      profileVisibility: visibility,
      showAttendance: row.show_attendance,
    };
  }

  static async getSocialProfile(
    userId: string,
    supabaseClient: SupabaseClientType
  ): Promise<SocialProfile> {
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('id, full_name, avatar_url, username, headline, bio, profile_visibility, show_attendance')
      .eq('id', userId)
      .single();

    if (error || !data) {
      throw new Error('Failed to fetch social profile.');
    }

    return this.mapSocialProfile(data);
  }

  static async updateSocialProfile(
    userId: string,
    updates: SocialProfileUpdateInput,
    supabaseClient: SupabaseClientType
  ): Promise<SocialProfile> {
    const payload: {
      username?: string | null;
      headline?: string | null;
      bio?: string | null;
      profile_visibility?: ProfileVisibility;
      show_attendance?: boolean;
      updated_at: string;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (Object.prototype.hasOwnProperty.call(updates, 'username')) {
      const rawUsername = updates.username;

      if (rawUsername === null || rawUsername === undefined || rawUsername.trim() === '') {
        payload.username = null;
      } else {
        const username = this.normalizeUsername(rawUsername);

        if (!this.isValidUsernameFormat(username)) {
          throw new Error('Username must be 3-30 chars, start with a letter, and use only letters, numbers, "_" or "-".');
        }

        if (this.isReservedUsername(username)) {
          throw new Error('That username is reserved.');
        }

        payload.username = username;
      }
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'headline')) {
      payload.headline = updates.headline?.trim() || null;
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'bio')) {
      payload.bio = updates.bio?.trim() || null;
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'profileVisibility') && updates.profileVisibility) {
      payload.profile_visibility = updates.profileVisibility;
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'showAttendance') && typeof updates.showAttendance === 'boolean') {
      payload.show_attendance = updates.showAttendance;
    }

    const { data, error } = await supabaseClient
      .from('profiles')
      .update(payload)
      .eq('id', userId)
      .select('id, full_name, avatar_url, username, headline, bio, profile_visibility, show_attendance')
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('That username is already taken.');
      }
      throw new Error('Failed to update social profile.');
    }

    if (!data) {
      throw new Error('Failed to update social profile.');
    }

    return this.mapSocialProfile(data);
  }

  static async checkUsernameAvailability(
    username: string,
    userId: string,
    supabaseClient: SupabaseClientType
  ): Promise<UsernameAvailabilityResult> {
    const normalizedUsername = this.normalizeUsername(username);
    const escapedUsername = this.escapeLikePattern(normalizedUsername);

    if (!this.isValidUsernameFormat(normalizedUsername)) {
      return {
        username: normalizedUsername,
        available: false,
        reason: 'invalid',
        message: 'Username must be 3-30 chars, start with a letter, and use only letters, numbers, "_" or "-".',
      };
    }

    if (this.isReservedUsername(normalizedUsername)) {
      return {
        username: normalizedUsername,
        available: false,
        reason: 'reserved',
        message: 'That username is reserved.',
      };
    }

    const { data, error } = await supabaseClient
      .from('profiles')
      .select('id')
      .ilike('username', escapedUsername)
      .neq('id', userId)
      .limit(1);

    if (error) {
      throw new Error('Failed to check username availability.');
    }

    if ((data?.length ?? 0) > 0) {
      return {
        username: normalizedUsername,
        available: false,
        reason: 'taken',
        message: 'That username is already taken.',
      };
    }

    return {
      username: normalizedUsername,
      available: true,
      message: 'Username is available.',
    };
  }
}
