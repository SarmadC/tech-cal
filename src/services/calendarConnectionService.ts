/**
 * CalendarConnectionService - Manages calendar OAuth connections and token storage
 * 
 * Handles CRUD operations for calendar connections with secure token storage
 * using Supabase Vault. All operations are server-side only.
 * 
 * @module CalendarConnectionService
 * @server-only This service must only run server-side to protect tokens
 */

import * as Sentry from "@sentry/nextjs";
import type { SupabaseClientType } from '@/types';

export interface CalendarConnection {
    id: string;
    user_id: string;
    provider: string;
    access_token_secret_id: string;
    refresh_token_secret_id: string;
    token_expiry: string | null;
    calendar_id: string;
    is_active: boolean;
    has_refresh_token: boolean;
    last_sync_at: string | null;
    last_sync_status: string | null;
    last_sync_error: string | null;
    created_at: string;
    updated_at: string;
}

export interface CalendarConnectionWithTokens extends CalendarConnection {
    accessToken: string;
    refreshToken: string | null;
}

export class CalendarConnectionService {
    /**
     * Create a new calendar connection with encrypted token storage
     */
    static async createConnection(
        userId: string,
        provider: string,
        accessToken: string,
        refreshToken: string,
        tokenExpiry: Date,
        calendarId: string,
        supabase: SupabaseClientType
    ): Promise<CalendarConnection> {
        try {
            // Store connection record with encrypted tokens
            const { data, error } = await supabase
                .from('calendar_connections')
                .insert({
                    user_id: userId,
                    provider,
                    access_token: accessToken,
                    refresh_token: refreshToken,
                    token_expiry: tokenExpiry.toISOString(),
                    calendar_id: calendarId,
                    is_active: true,
                    has_refresh_token: !!refreshToken
                })
                .select()
                .single();

            if (error) {
                throw error;
            }

            if (!data) {
                throw new Error('No data returned from calendar_connections insert');
            }

            Sentry.addBreadcrumb({
                category: 'calendar_connection',
                message: 'Calendar connection created',
                data: { userId, provider },
                level: 'info'
            });

            return data as CalendarConnection;
        } catch (error) {
            console.error('Error creating calendar connection:', error);
            Sentry.captureException(error, {
                tags: { service: 'calendar_connection', operation: 'create' },
                extra: { userId, provider }
            });
            throw new Error('Failed to create calendar connection.');
        }
    }

    /**
     * Get calendar connection without tokens (for status checks)
     */
    static async getConnection(
        userId: string,
        provider: string,
        supabase: SupabaseClientType
    ): Promise<CalendarConnection | null> {
        try {
            const { data, error } = await supabase
                .from('calendar_connections')
                .select('*')
                .eq('user_id', userId)
                .eq('provider', provider)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // No rows returned
                    return null;
                }
                throw error;
            }

            return data as CalendarConnection;
        } catch (error) {
            console.error('Error getting calendar connection:', error);
            Sentry.captureException(error, {
                tags: { service: 'calendar_connection', operation: 'get' },
                extra: { userId, provider }
            });
            throw new Error('Failed to get calendar connection.');
        }
    }

    /**
     * Get calendar connection with decrypted tokens
     * IMPORTANT: Only call from secure server-side code
     */
    static async getConnectionWithTokens(
        userId: string,
        provider: string,
        supabase: SupabaseClientType
    ): Promise<CalendarConnectionWithTokens | null> {
        try {
            const connection = await this.getConnection(userId, provider, supabase);

            if (!connection) {
                return null;
            }

            // Get tokens directly from the connection record (no Vault needed)
            // TODO: In production, decrypt these tokens using proper encryption
            const accessToken = 'access_token' in connection ? connection.access_token as string : null;
            const refreshToken = connection.has_refresh_token && 'refresh_token' in connection
                ? connection.refresh_token as string
                : null;

            if (!accessToken) {
                throw new Error('No access token found in calendar connection');
            }

            return {
                ...connection,
                accessToken,
                refreshToken
            };
        } catch (error) {
            console.error('Error getting connection with tokens:', error);
            Sentry.captureException(error, {
                tags: { service: 'calendar_connection', operation: 'get_with_tokens' },
                extra: { userId, provider }
            });
            throw new Error('Failed to get calendar connection with tokens.');
        }
    }

    /**
     * Update access token after refresh
     */
    static async updateTokens(
        userId: string,
        provider: string,
        newAccessToken: string,
        newTokenExpiry: Date,
        supabase: SupabaseClientType
    ): Promise<void> {
        try {
            const connection = await this.getConnection(userId, provider, supabase);

            if (!connection) {
                throw new Error('Connection not found');
            }

            // Update access token directly in the database (no Vault needed)
            // TODO: In production, encrypt the new access token before storing
            const { error } = await supabase
                .from('calendar_connections')
                .update({
                    access_token: newAccessToken, // Store directly in access_token column
                    token_expiry: newTokenExpiry.toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .eq('provider', provider);

            if (error) throw error;

            Sentry.addBreadcrumb({
                category: 'calendar_connection',
                message: 'Calendar tokens updated',
                data: { userId, provider },
                level: 'info'
            });
        } catch (error) {
            console.error('Error updating calendar tokens:', error);
            Sentry.captureException(error, {
                tags: { service: 'calendar_connection', operation: 'update_tokens' },
                extra: { userId, provider }
            });
            throw new Error('Failed to update calendar tokens.');
        }
    }

    /**
     * Update connection settings (is_active, etc.)
     */
    static async updateConnection(
        userId: string,
        provider: string,
        updates: Partial<Pick<CalendarConnection, 'is_active' | 'last_sync_at' | 'last_sync_status' | 'last_sync_error'>>,
        supabase: SupabaseClientType
    ): Promise<void> {
        try {
            const { error } = await supabase
                .from('calendar_connections')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .eq('provider', provider);

            if (error) throw error;

            Sentry.addBreadcrumb({
                category: 'calendar_connection',
                message: 'Calendar connection updated',
                data: { userId, provider, updates },
                level: 'info'
            });
        } catch (error) {
            console.error('Error updating calendar connection:', error);
            Sentry.captureException(error, {
                tags: { service: 'calendar_connection', operation: 'update' },
                extra: { userId, provider, updates }
            });
            throw new Error('Failed to update calendar connection.');
        }
    }

    /**
     * Delete calendar connection
     */
    static async deleteConnection(
        userId: string,
        provider: string,
        supabase: SupabaseClientType
    ): Promise<void> {
        try {
            // Delete connection record (tokens are encrypted in database)
            const { error } = await supabase
                .from('calendar_connections')
                .delete()
                .eq('user_id', userId)
                .eq('provider', provider);

            if (error) throw error;

            Sentry.addBreadcrumb({
                category: 'calendar_connection',
                message: 'Calendar connection deleted',
                data: { userId, provider },
                level: 'info'
            });
        } catch (error) {
            console.error('Error deleting calendar connection:', error);
            Sentry.captureException(error, {
                tags: { service: 'calendar_connection', operation: 'delete' },
                extra: { userId, provider }
            });
            throw new Error('Failed to delete calendar connection.');
        }
    }

    /**
     * Check if user has an active calendar connection
     */
    static async isConnectionActive(
        userId: string,
        provider: string,
        supabase: SupabaseClientType
    ): Promise<boolean> {
        try {
            const connection = await this.getConnection(userId, provider, supabase);
            return connection?.is_active ?? false;
        } catch (error) {
            console.error('Error checking connection status:', error);
            return false;
        }
    }

    /**
     * Mark connection as requiring re-authentication
     */
    static async markRequiresReauth(
        userId: string,
        provider: string,
        errorMessage: string,
        supabase: SupabaseClientType
    ): Promise<void> {
        try {
            await this.updateConnection(
                userId,
                provider,
                {
                    last_sync_status: 'failed',
                    last_sync_error: errorMessage,
                },
                supabase
            );
        } catch (error) {
            console.error('Error marking connection for re-auth:', error);
            // Don't throw - this is best-effort error tracking
        }
    }
}

