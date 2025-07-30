// src/services/profileService.ts
import { supabase } from '@/lib/supabaseClient';
import type {
    AppProfile,
    SupabaseProfile,
    ApiResponse,
    ProfileUpdateForm
} from '@/types';
import { profileTransformer } from '@/utils/transformers';

export class ProfileService {
    /**
     * Get user profile by ID
     */
    static async getProfile(userId: string): Promise<ApiResponse<AppProfile>> {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return { success: false, error: 'Profile not found' };
                }
                throw error;
            }

            if (!data) {
                return { success: false, error: 'Profile not found' };
            }

            const profile = profileTransformer.toApp(data as SupabaseProfile);
            return { success: true, data: profile };
        } catch (error) {
            console.error('Error fetching profile:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch profile' };
        }
    }

    /**
     * Create a new user profile
     */
    static async createProfile(profileData: {
        id: string;
        fullName: string;
        avatarUrl?: string | null;
        timezone?: string;
        preferences?: Record<string, unknown>;
    }): Promise<ApiResponse<AppProfile>> {
        try {
            const supabaseData = profileTransformer.toSupabase({
                id: profileData.id,
                fullName: profileData.fullName,
                avatarUrl: profileData.avatarUrl || null,
                timezone: profileData.timezone || null,
                preferences: profileData.preferences || null,
            });

            const { data, error } = await supabase
                .from('profiles')
                .insert([{
                    ...supabaseData,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                }])
                .select()
                .single();

            if (error) {
                throw error;
            }

            if (!data) {
                throw new Error('Failed to create profile - no data returned');
            }

            const profile = profileTransformer.toApp(data as SupabaseProfile);
            return {
                success: true,
                data: profile,
                message: 'Profile created successfully'
            };
        } catch (error) {
            console.error('Error creating profile:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create profile'
            };
        }
    }

    /**
     * Update user profile
     */
static async updateProfile(
        userId: string,
        updates: ProfileUpdateForm
    ): Promise<ApiResponse<AppProfile>> {
        try {
            // Convert app data to supabase format
            const supabaseUpdates = profileTransformer.toSupabase(updates);

            // The transformer already handles converting `updatedAt`, so we just need to add it to the updates object.
            // Let's ensure the timestamp is always fresh.
            const updateData = {
                ...supabaseUpdates,
                updated_at: new Date().toISOString(),
            };

            const { data, error } = await supabase
                .from('profiles')
                .update(updateData)
                .eq('id', userId)
                .select()
                .single();

            if (error) {
                throw error;
            }

            if (!data) {
                throw new Error('Profile update failed - no data returned');
            }

            const updatedProfile = profileTransformer.toApp(data as SupabaseProfile);

            // Also update the auth user metadata if name or avatar changed
            if (updates.fullName || updates.avatarUrl !== undefined) {
                await this.updateAuthUserMetadata({
                    full_name: updates.fullName,
                    avatar_url: updates.avatarUrl,
                });
            }

            return {
                success: true,
                data: updatedProfile,
                message: 'Profile updated successfully'
            };
        } catch (error) {
            console.error('Error updating profile:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update profile'
            };
        }
    }

    /**
     * Delete user profile
     */
    static async deleteProfile(userId: string): Promise<ApiResponse<void>> {
        try {
            const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', userId);

            if (error) {
                throw error;
            }

            return {
                success: true,
                message: 'Profile deleted successfully'
            };
        } catch (error) {
            console.error('Error deleting profile:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to delete profile'
            };
        }
    }

    /**
     * Update user avatar
     */
    static async updateAvatar(
        userId: string,
        avatarFile: File
    ): Promise<ApiResponse<{ avatarUrl: string }>> {
        try {
            // Upload avatar to Supabase Storage
            const fileExt = avatarFile.name.split('.').pop();
            const fileName = `${userId}-${Date.now()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            // 👇 FIX IS HERE: Rename `uploadData` to `_uploadData`
            const { data: _uploadData, error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, avatarFile, {
                    cacheControl: '3600',
                    upsert: true,
                });

            if (uploadError) {
                throw uploadError;
            }

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            const avatarUrl = urlData.publicUrl;

            // Update profile with new avatar URL
            const updateResult = await this.updateProfile(userId, {
                avatarUrl
            });

            if (!updateResult.success) {
                // We can be more specific with the error message
                throw new Error(updateResult.error || 'Failed to save avatar URL to profile.');
            }

            return {
                success: true,
                data: { avatarUrl },
                message: 'Avatar updated successfully'
            };
        } catch (error) {
            console.error('Error updating avatar:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update avatar'
            };
        }
    }

    /**
     * Get user preferences
     */
    static async getPreferences(userId: string): Promise<ApiResponse<Record<string, unknown>>> {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('preferences')
                .eq('id', userId)
                .single();

            if (error) {
                throw error;
            }

            return {
                success: true,
                data: data?.preferences || {}
            };
        } catch (error) {
            console.error('Error fetching preferences:', error);
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
        preferences: Record<string, unknown>
    ): Promise<ApiResponse<void>> {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    preferences,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);

            if (error) {
                throw error;
            }

            return {
                success: true,
                message: 'Preferences updated successfully'
            };
        } catch (error) {
            console.error('Error updating preferences:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update preferences'
            };
        }
    }

    /**
     * Check if profile exists
     */
    static async profileExists(userId: string): Promise<boolean> {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error checking profile existence:', error);
            }

            return !!data;
        } catch (error) {
            console.error('Error checking profile existence:', error);
            return false;
        }
    }

    /**
     * Get profile statistics (for dashboard)
     */
    static async getProfileStats(userId: string): Promise<ApiResponse<{
        totalTrackedEvents: number;
        attendedEvents: number;
        joinDate: string;
        lastActivity: string;
    }>> {
        try {
            // Get profile join date
            const { data: profileData } = await supabase
                .from('profiles')
                .select('created_at')
                .eq('id', userId)
                .single();

            // Get event tracking stats
            const { data: trackingData } = await supabase
                .from('user_events')
                .select('status, created_at')
                .eq('user_id', userId);

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
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch profile stats'
            };
        }
    }

    /**
     * Update auth user metadata (private helper)
     */
    private static async updateAuthUserMetadata(metadata: {
        full_name?: string;
        avatar_url?: string | null;
    }): Promise<void> {
        try {
            // 👇 FIX IS HERE: Replace `any` with a specific, type-safe object signature.
            const updates: { full_name?: string; avatar_url?: string | null } = {};

            if (metadata.full_name !== undefined) {
                updates.full_name = metadata.full_name;
            }

            if (metadata.avatar_url !== undefined) {
                updates.avatar_url = metadata.avatar_url;
            }

            if (Object.keys(updates).length > 0) {
                const { error } = await supabase.auth.updateUser({
                    data: updates
                });

                if (error) {
                    // It's better to throw the error here to be handled by the caller,
                    // but logging is also acceptable for a private helper.
                    console.error('Error updating auth user metadata:', error);
                }
            }
        } catch (error) {
            console.error('Error in updateAuthUserMetadata:', error);
        }
    }
}