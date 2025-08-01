import { supabase as browserSupabaseClient, SupabaseClientType } from '@/lib/supabaseClient';
import type { AppProfile, ApiResponse, ProfileUpdateForm, Json } from '@/types';
import { profileTransformer } from '@/utils/transformers';
import * as Sentry from "@sentry/nextjs";

export class ProfileService {
    /**
     * Get user profile by ID
     */
    static async getProfile(
        userId: string,
        supabaseClient: SupabaseClientType = browserSupabaseClient
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
        supabaseClient: SupabaseClientType = browserSupabaseClient
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
        supabaseClient: SupabaseClientType = browserSupabaseClient
    ): Promise<ApiResponse<AppProfile>> {
        try {
            // ... (main logic remains the same)
            const supabaseUpdates = profileTransformer.toSupabase(updates);
            const { data, error } = await supabaseClient
                .from('profiles')
                .update({ ...supabaseUpdates, updated_at: new Date().toISOString() })
                .eq('id', userId)
                .select()
                .single();

            if (error) throw error;
            if (!data) throw new Error('Profile update failed');

            const authMetadataUpdates: { full_name?: string; avatar_url?: string | null } = {};
            if (updates.hasOwnProperty('fullName')) {
                authMetadataUpdates.full_name = updates.fullName ?? undefined;
            }
            if (updates.hasOwnProperty('avatarUrl')) {
                authMetadataUpdates.avatar_url = updates.avatarUrl;
            }

            if (Object.keys(authMetadataUpdates).length > 0) {
                const { error: authError } = await supabaseClient.auth.updateUser({ data: authMetadataUpdates });
                if (authError) {
                    console.error('Error updating auth user metadata:', authError);
                    // Also report this non-critical error to Sentry
                    Sentry.captureException(authError, { level: 'warning', extra: { function: 'updateProfile.authUpdate', userId } });
                }
            }

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
        supabaseClient: SupabaseClientType = browserSupabaseClient
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
        supabaseClient: SupabaseClientType = browserSupabaseClient
    ): Promise<ApiResponse<{ avatarUrl: string }>> {
        try {
            // ... (main logic remains the same)
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

    /**
     * Get user preferences
     */
    static async getPreferences(
        userId: string,
        supabaseClient: SupabaseClientType = browserSupabaseClient
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
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch preferences'
            };
        }
    }

    /**
     * Update user preferences
     */
    static async updatePreferences(
        userId: string,
        preferences: Json,
        supabaseClient: SupabaseClientType = browserSupabaseClient
    ): Promise<ApiResponse<void>> {
        try {
            const { error } = await supabaseClient
                .from('profiles')
                .update({ preferences, updated_at: new Date().toISOString() })
                .eq('id', userId);

            if (error) throw error;

            return {
                success: true,
                message: 'Preferences updated successfully'
            };
        } catch (error) {
            console.error('Error updating preferences:', error);
            Sentry.captureException(error, { extra: { function: 'updatePreferences', userId, preferences } });
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update preferences'
            };
        }
    }

    /**
     * Check if profile exists
     */
    static async profileExists(
        userId: string,
        supabaseClient: SupabaseClientType = browserSupabaseClient
    ): Promise<boolean> {
        try {
            const { data, error } = await supabaseClient.from('profiles').select('id').eq('id', userId).single();
            if (error && error.code !== 'PGRST116') {
                console.error('Error checking profile existence:', error);
                Sentry.captureException(error, { level: 'log', extra: { function: 'profileExists', userId } });
            }
            return !!data;
        } catch (error) {
            console.error('Error checking profile existence:', error);
            Sentry.captureException(error, { extra: { function: 'profileExists', userId } });
            return false;
        }
    }

    /**
     * Get profile statistics (for dashboard)
     */
    static async getProfileStats(
        userId: string,
        supabaseClient: SupabaseClientType = browserSupabaseClient
    ): Promise<ApiResponse<{
        totalTrackedEvents: number;
        attendedEvents: number;
        joinDate: string;
        lastActivity: string;
    }>> {
        try {
            // ... (main logic remains the same)
            const { data: profileData } = await supabaseClient.from('profiles').select('created_at').eq('id', userId).single();
            const { data: trackingData } = await supabaseClient.from('user_events').select('status, created_at').eq('user_id', userId).order('created_at', { ascending: false });

            const totalTrackedEvents = trackingData?.length || 0;
            const attendedEvents = trackingData?.filter(e => e.status === 'attended').length || 0;
            const lastActivity = trackingData?.[0]?.created_at || profileData?.created_at || '';

            return {
                success: true,
                data: {
                    totalTrackedEvents,
                    attendedEvents,
                    joinDate: profileData?.created_at || '',
                    lastActivity,
                }
            };
        } catch (error) {
            console.error('Error fetching profile stats:', error);
            Sentry.captureException(error, { extra: { function: 'getProfileStats', userId } });
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch profile stats'
            };
        }
    }

    /**
     * Update auth user metadata (private helper)
     */
    private static async updateAuthUserMetadata(
        metadata: { full_name?: string; avatar_url?: string | null },
        supabaseClient: SupabaseClientType = browserSupabaseClient
    ): Promise<void> {
        try {
            const updates: { full_name?: string; avatar_url?: string | null } = {};
            if (metadata.hasOwnProperty('full_name')) updates.full_name = metadata.full_name;
            if (metadata.hasOwnProperty('avatar_url')) updates.avatar_url = metadata.avatar_url;

            if (Object.keys(updates).length > 0) {
                const { error } = await supabaseClient.auth.updateUser({ data: updates });
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