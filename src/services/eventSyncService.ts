// src/services/eventSyncService.ts

import { createClient } from '@/utils/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import * as Sentry from '@sentry/nextjs';
import { 
  WebhookPayload, 
  WebhookAction, 
  WebhookProcessingResult,
  EventSource 
} from '@/types/eventImport';

/**
 * Consolidated service for handling event synchronization via webhooks and scheduled syncs
 * Follows DRY principle by reusing existing adapters and database patterns
 */
export class EventSyncService {
  
  /**
   * Process webhook payload and sync event changes
   */
  static async processWebhook(
    source: EventSource,
    payload: WebhookPayload,
    signatureVerified: boolean
  ): Promise<WebhookProcessingResult> {
    const startTime = Date.now();
    const supabase = await createClient();
    
    try {
      // 1. Log webhook receipt (using existing database function)
      await this.logWebhookEvent(
        supabase,
        source,
        payload.config.action,
        this.extractExternalId(payload.api_url),
        payload,
        signatureVerified
      );

      // 2. Find the event in our database
      const eventId = await this.findEventByApiUrl(supabase, payload.api_url);
      if (!eventId) {
        return this.createResult(false, payload.config.action, startTime, 'Event not found in database');
      }

      // 3. Handle the webhook action
      const changes = await this.handleWebhookAction(
        supabase,
        eventId,
        payload.config.action,
        payload.api_url,
        source
      );

      // 4. Log the sync operation
      await this.logEventSync(
        supabase,
        eventId,
        'webhook',
        changes,
        changes.length > 0 ? 'success' : 'no_changes',
        Date.now() - startTime
      );

      // 5. Notify users if event was cancelled
      let notifiedUsers = 0;
      if (payload.config.action === 'event.unpublished' && changes.includes('status')) {
        notifiedUsers = await this.notifyEventCancellation(supabase, eventId);
      }

      return this.createResult(true, payload.config.action, startTime, undefined, eventId, changes, notifiedUsers);

    } catch (error) {
      console.error('[EventSyncService] Webhook processing failed:', error);
      Sentry.captureException(error, { 
        tags: { service: 'EventSyncService', action: 'processWebhook' },
        extra: { source, action: payload.config.action, payload }
      });

      return this.createResult(false, payload.config.action, startTime, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Handle specific webhook actions (consolidated logic following DRY principle)
   */
  private static async handleWebhookAction(
    supabase: SupabaseClient,
    eventId: string,
    action: WebhookAction,
    _apiUrl: string,
    _source: EventSource
  ): Promise<string[]> {
    // Consolidated update function (DRY)
    const updateEvent = async (updates: Record<string, unknown>): Promise<string[]> => {
      const finalUpdates = {
        ...updates,
        last_synced_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('events')
        .update(finalUpdates)
        .eq('id', eventId);

      if (error) throw error;
      return Object.keys(updates);
    };

    switch (action) {
      case 'event.unpublished':
        return await updateEvent({
          status: 'cancelled',
          external_status: 'unpublished'
        });

      case 'event.published':
        return await updateEvent({
          status: 'published',
          external_status: 'published'
        });

      case 'event.updated':
        // For event updates, we could fetch latest data, but for now just mark as synced
        // This prevents unnecessary API calls while maintaining audit trail
        return await updateEvent({});

      case 'order.placed':
      case 'order.refunded':
        // For order events, we could update attendee count
        // For now, just log the event without making additional API calls
        console.log(`[EventSyncService] Order event ${action} for event ${eventId}`);
        return await updateEvent({});

      case 'venue.updated':
      case 'organizer.updated':
        // For venue/organizer updates, mark event as needing sync
        return await updateEvent({});

      default:
        console.log(`[EventSyncService] Unhandled webhook action: ${action}`);
        return [];
    }
  }

  /**
   * Notify users about event cancellation (reuse existing notification system)
   */
  private static async notifyEventCancellation(
    supabase: SupabaseClient,
    eventId: string
  ): Promise<number> {
    try {
      // Get all users who bookmarked/are attending this event
      const { data: affectedUsers } = await supabase
        .from('user_events')
        .select('user_id')
        .eq('event_id', eventId)
        .in('status', ['bookmarked', 'attending']);

      if (!affectedUsers?.length) return 0;

      // Insert notifications (leveraging existing user_notifications table)
      const notifications = affectedUsers.map(user => ({
        user_id: user.user_id,
        event_id: eventId,
        notification_type: 'event_cancelled',
        status: 'pending'
      }));

      const { error } = await supabase
        .from('user_notifications')
        .insert(notifications);

      if (error) throw error;

      return affectedUsers.length;

    } catch (error) {
      console.error('[EventSyncService] Failed to create cancellation notifications:', error);
      Sentry.captureException(error);
      return 0;
    }
  }


  /**
   * Utility: Extract external ID from API URL
   */
  private static extractExternalId(apiUrl: string): string {
    const match = apiUrl.match(/\/events\/(\d+)\/?/);
    return match ? match[1] : '';
  }

  /**
   * Utility: Find event by API URL (reuse database function)
   */
  private static async findEventByApiUrl(
    supabase: SupabaseClient,
    apiUrl: string
  ): Promise<string | null> {
    const externalId = this.extractExternalId(apiUrl);
    
    const { data } = await supabase
      .rpc('find_event_by_external_id', {
        p_external_id: externalId,
        p_source: 'eventbrite'
      });

    return data || null;
  }

  /**
   * Utility: Log webhook event (reuse database function)
   */
  private static async logWebhookEvent(
    supabase: SupabaseClient,
    source: EventSource,
    action: WebhookAction,
    externalId: string,
    payload: WebhookPayload,
    signatureVerified: boolean
  ): Promise<string> {
    const { data } = await supabase
      .rpc('log_webhook_event', {
        p_source: source,
        p_action: action,
        p_external_id: externalId,
        p_payload: payload as unknown,
        p_signature_verified: signatureVerified
      });

    return data || '';
  }

  /**
   * Utility: Log event sync operation
   */
  private static async logEventSync(
    supabase: SupabaseClient,
    eventId: string,
    syncType: 'webhook' | 'scheduled' | 'manual',
    changes: string[],
    result: 'success' | 'error' | 'no_changes',
    processingTimeMs: number,
    errorMessage?: string
  ): Promise<void> {
    await supabase
      .from('event_sync_log')
      .insert({
        event_id: eventId,
        sync_type: syncType,
        changes_detected: changes,
        sync_result: result,
        processing_time_ms: processingTimeMs,
        error_message: errorMessage
      });
  }

  /**
   * Utility: Create consistent result object
   */
  private static createResult(
    success: boolean,
    action: WebhookAction,
    startTime: number,
    error?: string,
    eventId?: string,
    changes?: string[],
    notifiedUsers?: number
  ): WebhookProcessingResult {
    return {
      success,
      action,
      processingTimeMs: Date.now() - startTime,
      eventId,
      changes,
      error,
      notifiedUsers
    };
  }
}
