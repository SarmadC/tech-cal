/**
 * GoogleCalendarService - Interfaces with Google Calendar API v3
 * 
 * Handles all Google Calendar operations including event creation, deletion,
 * and token refresh using custom OAuth credentials.
 * 
 * CRITICAL: Uses custom Google OAuth client ID/secret (stored in env vars)
 * for token refresh. Supabase-managed OAuth doesn't expose these credentials.
 * 
 * @module GoogleCalendarService
 * @server-only This service must only run server-side to protect API credentials
 */

import { google } from 'googleapis';
import * as Sentry from '@sentry/nextjs';
import { getErrorMessage } from '@/utils/errorHandling';

interface GoogleApiError {
    code?: number;
    status?: number;
    response?: {
        status?: number;
        data?: {
            error?: {
                code?: number;
                message?: string;
            };
        };
    };
    message?: string;
}

export interface CalendarEvent {
    title: string;
    description: string;
    location: string;
    startTime: string;
    endTime: string;
    sourceUrl?: string;
}

export interface TokenRefreshResult {
    accessToken: string;
    expiresAt: Date;
}

export class GoogleCalendarService {
    private static get CLIENT_ID(): string {
        const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
        if (!clientId) {
            throw new Error('GOOGLE_OAUTH_CLIENT_ID environment variable is not set');
        }
        return clientId;
    }

    private static get CLIENT_SECRET(): string {
        const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
        if (!clientSecret) {
            throw new Error('GOOGLE_OAUTH_CLIENT_SECRET environment variable is not set');
        }
        return clientSecret;
    }

    /**
     * Refresh access token using refresh token
     * Requires custom OAuth credentials configured in environment
     */
    static async refreshAccessToken(refreshToken: string): Promise<TokenRefreshResult> {
        try {
            const oauth2Client = new google.auth.OAuth2(
                this.CLIENT_ID,
                this.CLIENT_SECRET
            );

            oauth2Client.setCredentials({
                refresh_token: refreshToken
            });

            const { credentials } = await oauth2Client.refreshAccessToken();

            if (!credentials.access_token || !credentials.expiry_date) {
                throw new Error('Invalid credentials returned from token refresh');
            }

            Sentry.addBreadcrumb({
                category: 'google_calendar',
                message: 'Access token refreshed successfully',
                level: 'info'
            });

            return {
                accessToken: credentials.access_token,
                expiresAt: new Date(credentials.expiry_date)
            };
        } catch (error: unknown) {
            console.error('Error refreshing access token:', getErrorMessage(error));
            Sentry.captureException(error, {
                tags: { 
                    service: 'google_calendar',
                    operation: 'refresh_token',
                    error_code: GoogleCalendarService.getErrorCode(error) || 'unknown'
                }
            });
            throw error;
        }
    }

    /**
     * Create a calendar event in user's Google Calendar
     * @returns Google Calendar event ID
     */
    static async createCalendarEvent(
        accessToken: string,
        calendarId: string,
        event: CalendarEvent
    ): Promise<string> {
        return this.callWithRetry(async () => {
            const auth = new google.auth.OAuth2(
                this.CLIENT_ID,
                this.CLIENT_SECRET
            );
            auth.setCredentials({ access_token: accessToken });
            
            const calendar = google.calendar({ version: 'v3', auth });

            const eventDescription = event.description + 
                (event.sourceUrl ? `\n\nEvent Details: ${event.sourceUrl}` : '') +
                '\n\n📅 Added by TechCal';

            const response = await calendar.events.insert({
                calendarId,
                requestBody: {
                    summary: event.title,
                    description: eventDescription,
                    location: event.location,
                    start: {
                        dateTime: event.startTime,
                        timeZone: 'UTC'
                    },
                    end: {
                        dateTime: event.endTime,
                        timeZone: 'UTC'
                    },
                    source: {
                        title: 'TechCal',
                        url: event.sourceUrl || 'https://kurecal.app'
                    }
                }
            });

            if (!response.data.id) {
                throw new Error('No event ID returned from Google Calendar');
            }

            Sentry.addBreadcrumb({
                category: 'google_calendar',
                message: 'Calendar event created',
                data: { eventId: response.data.id },
                level: 'info'
            });

            return response.data.id;
        }, 'createCalendarEvent');
    }

    /**
     * Update an existing calendar event in user's Google Calendar
     */
    static async updateCalendarEvent(
        accessToken: string,
        calendarId: string,
        eventId: string,
        event: CalendarEvent
    ): Promise<void> {
        return this.callWithRetry(async () => {
            const auth = new google.auth.OAuth2(
                this.CLIENT_ID,
                this.CLIENT_SECRET
            );
            auth.setCredentials({ access_token: accessToken });
            
            const calendar = google.calendar({ version: 'v3', auth });

            const eventDescription = event.description + 
                (event.sourceUrl ? `\n\nEvent Details: ${event.sourceUrl}` : '') +
                '\n\n📅 Added by TechCal';

            await calendar.events.update({
                calendarId,
                eventId,
                requestBody: {
                    summary: event.title,
                    description: eventDescription,
                    location: event.location,
                    start: {
                        dateTime: event.startTime,
                        timeZone: 'UTC'
                    },
                    end: {
                        dateTime: event.endTime,
                        timeZone: 'UTC'
                    },
                    source: {
                        title: 'TechCal',
                        url: event.sourceUrl || 'https://kurecal.app'
                    }
                }
            });

            Sentry.addBreadcrumb({
                category: 'google_calendar',
                message: 'Calendar event updated',
                data: { eventId },
                level: 'info'
            });
        }, 'updateCalendarEvent');
    }

    /**
     * Delete a calendar event from user's Google Calendar
     */
    static async deleteCalendarEvent(
        accessToken: string,
        calendarId: string,
        eventId: string
    ): Promise<void> {
        return this.callWithRetry(async () => {
            const auth = new google.auth.OAuth2(
                this.CLIENT_ID,
                this.CLIENT_SECRET
            );
            auth.setCredentials({ access_token: accessToken });
            
            const calendar = google.calendar({ version: 'v3', auth });

            await calendar.events.delete({
                calendarId,
                eventId
            });

            Sentry.addBreadcrumb({
                category: 'google_calendar',
                message: 'Calendar event deleted',
                data: { eventId },
                level: 'info'
            });
        }, 'deleteCalendarEvent');
    }

    /**
     * Get user's primary calendar ID
     */
    static async getPrimaryCalendar(accessToken: string): Promise<string> {
        try {
            const auth = new google.auth.OAuth2(
                this.CLIENT_ID,
                this.CLIENT_SECRET
            );
            auth.setCredentials({ access_token: accessToken });
            
            console.log('DEBUG: Google Calendar API call:', {
                hasClientId: !!this.CLIENT_ID,
                hasClientSecret: !!this.CLIENT_SECRET,
                accessTokenLength: accessToken.length,
                accessTokenPrefix: accessToken.substring(0, 20) + '...'
            });
            
            const calendar = google.calendar({ version: 'v3', auth });
            
            const response = await calendar.calendarList.get({
                calendarId: 'primary'
            });

            if (!response.data.id) {
                throw new Error('No calendar ID returned');
            }

            return response.data.id;
        } catch (error: unknown) {
            console.error('Error getting primary calendar:', getErrorMessage(error));
            Sentry.captureException(error, {
                tags: { 
                    service: 'google_calendar',
                    operation: 'get_primary_calendar',
                    error_code: GoogleCalendarService.getErrorCode(error) || 'unknown'
                }
            });
            throw error;
        }
    }

    /**
     * Retry wrapper with exponential backoff for rate limits and server errors
     */
    private static async callWithRetry<T>(
        fn: () => Promise<T>,
        operation: string,
        maxRetries = 1
    ): Promise<T> {
        let lastError: unknown;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error: unknown) {
                lastError = error;

                // Extract error code from Google API error
                const errorCode = GoogleCalendarService.getErrorCode(error);
                const errorMessage = getErrorMessage(error);

                // Log retry attempt
                Sentry.addBreadcrumb({
                    category: 'google_calendar',
                    message: `Calendar API error (attempt ${attempt + 1}/${maxRetries + 1})`,
                    data: {
                        operation,
                        errorCode,
                        errorMessage,
                        attempt: attempt + 1,
                        maxRetries: maxRetries + 1
                    },
                    level: 'warning'
                });

                // Handle rate limiting (429)
                if (errorCode === 429 && attempt < maxRetries) {
                    const delay = 1000 + Math.random() * 1000; // 1-2 seconds
                    console.log(`Rate limited, retrying after ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }

                // Handle server errors (5xx)
                if (errorCode && errorCode >= 500 && errorCode < 600 && attempt < maxRetries) {
                    console.log(`Server error ${errorCode}, retrying after 1s...`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    continue;
                }

                // Don't retry other errors (401, 403, 404, etc.)
                break;
            }
        }

        // All retries failed - capture exception with full context
        Sentry.captureException(lastError, {
            tags: {
                service: 'google_calendar',
                operation,
                error_code: GoogleCalendarService.getErrorCode(lastError) || 'unknown',
                retries: maxRetries
            },
            contexts: {
                calendar: {
                    operation,
                    attempts: maxRetries + 1,
                    final_error: getErrorMessage(lastError)
                }
            }
        });

        throw lastError;
    }

    /**
     * Map Google Calendar API errors to user-friendly messages
     */
    static getFriendlyError(error: unknown): string {
        const errorCode = GoogleCalendarService.getErrorCode(error);

        switch (errorCode) {
            case 401:
            case 403:
                return 'Please reconnect your calendar in settings';
            case 429:
                return 'Too many requests. Please try again in a moment.';
            case 404:
                return 'Calendar not found. Please reconnect your calendar.';
            case 500:
            case 502:
            case 503:
            case 504:
                return 'Google Calendar is temporarily unavailable. Please try again later.';
            default:
                if (getErrorMessage(error).toLowerCase().includes('network')) {
                    return 'Connection failed. Please check your internet connection.';
                }
                return 'Calendar sync failed. Please try again.';
        }
    }

    /**
     * Extract error code from Google API error
     */
    static getErrorCode(error: unknown): number | undefined {
        if (typeof error === 'object' && error !== null) {
            const apiError = error as GoogleApiError;
            return apiError.code || apiError.status || apiError.response?.status;
        }
        return undefined;
    }

    /**
     * Check if error indicates token needs refresh (401/403)
     */
    static isTokenExpiredError(error: unknown): boolean {
        const errorCode = GoogleCalendarService.getErrorCode(error);
        return errorCode === 401 || errorCode === 403;
    }
}

