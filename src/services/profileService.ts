// src/services/profileService.ts
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import type { AppProfile, ApiResponse, ProfileUpdateForm, Json } from '@/types';
import { profileTransformer } from '@/utils/transformers';
import * as Sentry from "@sentry/nextjs";

type SupabaseClientType = SupabaseClient<Database>;

export class ProfileService {
    /**
     * Get user profile by ID
     */
    static async getProfile(
        userId: string,
        supabaseClient: SupabaseClientType // Now required
    ): Promise<ApiResponse<AppProfile>> {
        try {
            const { data, error } = await supabaseClient.from('profiles').select('*').eq('id', userId).single();
            if (error) {
                if (error.code === 'PGRST116') return { success: false, error: 'Profile not found' };
                throw error;
            }
            if (!data) return { success: false, error: 'Profile not found' };

            const profile = profileTransformer.toApp(data);
            return { success: true, data: profile };
        } catch (error) {
            console.error('Error fetching profile:', error);
            Sentry.captureException(error, { extra: { function: 'getProfile', userId } });
            return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch profile' };
        }
    }

    /**
     * Create a new user profile
     */
    static async createProfile(
        profileData: {
            id: string;
            fullName: string | null;
            avatarUrl?: string | null;
            timezone?: string;
            preferences?: Json;
        },
        supabaseClient: SupabaseClientType // Now required
    ): Promise<ApiResponse<AppProfile>> {
        try {
            const { data, error } = await supabaseClient
                .from('profiles')
                .insert({
                    id: profileData.id,
                    full_name: profileData.fullName,
                    avatar_url: profileData.avatarUrl,
                    timezone: profileData.timezone,
                    preferences: profileData.preferences,
                })
                .select()
                .single();

            if (error) throw error;
            if (!data) throw new Error('Failed to create profile');

            const profile = profileTransformer.toApp(data);
            return { success: true, data: profile, message: 'Profile created successfully' };
        } catch (error) {
            console.error('Error creating profile:', error);
            Sentry.captureException(error, { extra: { function: 'createProfile', userId: profileData.id } });
            return { success: false, error: error instanceof Error ? error.message : 'Failed to create profile' };
        }
    }

    /**
     * Update user profile and associated auth metadata
     */
    static async updateProfile(
        userId: string,
        updates: ProfileUpdateForm,
        supabaseClient: SupabaseClientType // Now required
    ): Promise<ApiResponse<AppProfile>> {
        try {
            const supabaseUpdates = profileTransformer.toSupabase(updates);
            const { data, error } = await supabaseClient
                .from('profiles')
                .update({ ...supabaseUpdates, updated_at: new Date().toISOString() })
                .eq('id', userId)
                .select()
                .single();

            if (error) throw error;
            if (!data) throw new Error('Profile update failed');

            await this.updateAuthUserMetadata(updates, supabaseClient);

            const updatedProfile = profileTransformer.toApp(data);
            return { success: true, data: updatedProfile, message: 'Profile updated successfully' };
        } catch (error) {
            console.error('Error updating profile:', error);
            Sentry.captureException(error, { extra: { function: 'updateProfile', userId, updates } });
            return { success: false, error: error instanceof Error ? error.message : 'Failed to update profile' };
        }
    }

    /**
     * Delete user profile
     */
    static async deleteProfile(
        userId: string,
        supabaseClient: SupabaseClientType // Now required
    ): Promise<ApiResponse<void>> {
        try {
            const { error } = await supabaseClient.from('profiles').delete().eq('id', userId);
            if (error) throw error;
            return { success: true, message: 'Profile deleted successfully' };
        } catch (error) {
            console.error('Error deleting profile:', error);
            Sentry.captureException(error, { extra: { function: 'deleteProfile', userId } });
            return { success: false, error: error instanceof Error ? error.message : 'Failed to delete profile' };
        }
    }

    /**
     * Update user avatar
     */
    static async updateAvatar(
        userId: string,
        avatarFile: File,
        supabaseClient: SupabaseClientType // Now required
    ): Promise<ApiResponse<{ avatarUrl: string }>> {
        try {
            const fileExt = avatarFile.name.split('.').pop();
            const filePath = `avatars/${userId}-${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabaseClient.storage.from('avatars').upload(filePath, avatarFile, { cacheControl: '3600', upsert: true });
            if (uploadError) throw uploadError;

            const { data: urlData } = supabaseClient.storage.from('avatars').getPublicUrl(filePath);
            const avatarUrl = urlData.publicUrl;

            const updateResult = await this.updateProfile(userId, { avatarUrl }, supabaseClient);
            if (!updateResult.success) throw new Error(updateResult.error || 'Failed to save avatar URL to profile.');

            return { success: true, data: { avatarUrl }, message: 'Avatar updated successfully' };
        } catch (error) {
            console.error('Error updating avatar:', error);
            Sentry.captureException(error, { extra: { function: 'updateAvatar', userId, fileName: avatarFile.name } });
            return { success: false, error: error instanceof Error ? error.message : 'Failed to update avatar' };
        }
    }

    // ... rest of the methods refactored similarly ...

    static async getPreferences(
        userId: string,
        supabaseClient: SupabaseClientType
    ): Promise<ApiResponse<Json>> {
        try {
            const { data, error } = await supabaseClient
                .from('profiles')
                .select('preferences')
                .eq('id', userId)
                .single();

            if (error) throw error;
            return { success: true, data: data?.preferences || null };
        } catch (error) {
            console.error('Error fetching preferences:', error);
            Sentry.captureException(error, { extra: { function: 'getPreferences', userId } });
            return { success: false, error: 'Failed to fetch preferences' };
        }
    }

    static async updatePreferences(
        userId: string,
        preferences: Json,
        supabaseClient: SupabaseClientType
    ): Promise<ApiResponse<void>> {
        try {
            const { error } = await supabaseClient
                .from('profiles')
                .update({ preferences, updated_at: new Date().toISOString() })
                .eq('id', userId);

            if (error) throw error;
            return { success: true, message: 'Preferences updated successfully' };
        } catch (error) {
            console.error('Error updating preferences:', error);
            Sentry.captureException(error, { extra: { function: 'updatePreferences', userId, preferences } });
            return { success: false, error: 'Failed to update preferences' };
        }
    }

    /**
     * Update auth user metadata (private helper)
     */
    private static async updateAuthUserMetadata(
        updates: ProfileUpdateForm,
        supabaseClient: SupabaseClientType
    ): Promise<void> {
        try {
            const authMetadataUpdates: { data: { full_name?: string; avatar_url?: string | null } } = { data: {} };

            if (updates.hasOwnProperty('fullName')) {
                authMetadataUpdates.data.full_name = updates.fullName ?? undefined;
            }
            if (updates.hasOwnProperty('avatarUrl')) {
                authMetadataUpdates.data.avatar_url = updates.avatarUrl;
            }

            if (Object.keys(authMetadataUpdates.data).length > 0) {
                const { error } = await supabaseClient.auth.updateUser(authMetadataUpdates);
                if (error) {
                    console.error('Error updating auth user metadata:', error);
                    Sentry.captureException(error, { level: 'warning', extra: { function: 'updateAuthUserMetadata' } });
                }
            }
        } catch (error) {
            console.error('Error in updateAuthUserMetadata:', error);
            Sentry.captureException(error, { extra: { function: 'updateAuthUserMetadata' } });
        }
    }
}