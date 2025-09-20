// profileService.ts

import type { AppProfile, ProfileUpdateForm, Json, SupabaseClientType } from '@/types'; // ApiResponse is removed
import { profileTransformer } from '@/utils/transformers';
import * as Sentry from "@sentry/nextjs";

export class ProfileService {
    static async getProfile(
        userId: string,
        supabaseClient: SupabaseClientType
    ): Promise<AppProfile> {
        try {
            const { data, error } = await supabaseClient.from('profiles').select('*').eq('id', userId).single();

            // Handle "not found" as a specific thrown error
            if (error && error.code === 'PGRST116') throw new Error('Profile not found');
            if (error) throw error; // Throw other Supabase errors
            if (!data) throw new Error('Profile not found');

            return profileTransformer.toApp(data);
        } catch (error) {
            console.error('Error fetching profile:', error);
            Sentry.captureException(error, { extra: { function: 'getProfile', userId } });
            throw new Error('Failed to fetch profile.');
        }
    }

    static async createProfile(
        profileData: { id: string; fullName: string | null; avatarUrl?: string | null; timezone?: string; preferences?: Json; },
        supabaseClient: SupabaseClientType
    ): Promise<AppProfile> {
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
            if (!data) throw new Error('Failed to create profile, no data returned.');

            return profileTransformer.toApp(data);
        } catch (error) {
            console.error('Error creating profile:', error);
            Sentry.captureException(error, { extra: { function: 'createProfile', userId: profileData.id } });
            throw new Error('Failed to create profile.');
        }
    }

    static async updateProfile(
        userId: string,
        updates: ProfileUpdateForm,
        supabaseClient: SupabaseClientType
    ): Promise<AppProfile> {
        try {
            const supabaseUpdates = profileTransformer.toSupabase(updates);
            const { data, error } = await supabaseClient
                .from('profiles')
                .update({ ...supabaseUpdates, updated_at: new Date().toISOString() })
                .eq('id', userId)
                .select()
                .single();

            if (error) throw error;
            if (!data) throw new Error('Profile update failed, no data returned.');

            // This helper can remain as-is, as it handles its own errors internally.
            await this.updateAuthUserMetadata(updates, supabaseClient);

            return profileTransformer.toApp(data);
        } catch (error) {
            console.error('Error updating profile:', error);
            Sentry.captureException(error, { extra: { function: 'updateProfile', userId, updates } });
            throw new Error('Failed to update profile.');
        }
    }

    static async deleteProfile(
        userId: string,
        supabaseClient: SupabaseClientType
    ): Promise<void> {
        try {
            const { error } = await supabaseClient.from('profiles').delete().eq('id', userId);
            if (error) throw error;
        } catch (error) {
            console.error('Error deleting profile:', error);
            Sentry.captureException(error, { extra: { function: 'deleteProfile', userId } });
            throw new Error('Failed to delete profile.');
        }
    }

    static async updateAvatar(
        userId: string,
        avatarFile: File,
        supabaseClient: SupabaseClientType
    ): Promise<{ avatarUrl: string }> {
        try {
            const fileExt = avatarFile.name.split('.').pop();
            const filePath = `avatars/${userId}-${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabaseClient.storage.from('avatars').upload(filePath, avatarFile, { cacheControl: '3600', upsert: true });
            if (uploadError) throw uploadError;

            const { data: urlData } = supabaseClient.storage.from('avatars').getPublicUrl(filePath);
            const avatarUrl = urlData.publicUrl;

            // Now we can just `await` this. If it fails, the error will be caught by *this* function's catch block.
            await this.updateProfile(userId, { avatarUrl }, supabaseClient);

            return { avatarUrl };
        } catch (error) {
            console.error('Error updating avatar:', error);
            Sentry.captureException(error, { extra: { function: 'updateAvatar', userId, fileName: avatarFile.name } });
            throw new Error('Failed to update avatar.');
        }
    }

    static async getPreferences(
        userId: string,
        supabaseClient: SupabaseClientType
    ): Promise<Json> {
        try {
            const { data, error } = await supabaseClient
                .from('profiles')
                .select('preferences')
                .eq('id', userId)
                .single();

            if (error) throw error;
            return data?.preferences || null;
        } catch (error) {
            console.error('Error fetching preferences:', error);
            Sentry.captureException(error, { extra: { function: 'getPreferences', userId } });
            throw new Error('Failed to fetch preferences.');
        }
    }

    static async updatePreferences(
        userId: string,
        preferences: Json,
        supabaseClient: SupabaseClientType
    ): Promise<void> {
        try {
            const { error } = await supabaseClient
                .from('profiles')
                .update({ preferences, updated_at: new Date().toISOString() })
                .eq('id', userId);

            if (error) throw error;
        } catch (error) {
            console.error('Error updating preferences:', error);
            Sentry.captureException(error, { extra: { function: 'updatePreferences', userId, preferences } });
            throw new Error('Failed to update preferences.');
        }
    }

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