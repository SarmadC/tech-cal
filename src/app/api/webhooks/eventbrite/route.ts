// src/app/api/webhooks/eventbrite/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { EventSyncService } from '@/services/eventSyncService';
import { WebhookPayload } from '@/types/eventImport';
import * as Sentry from '@sentry/nextjs';
import crypto from 'crypto';

/**
 * Eventbrite webhook endpoint
 * Handles real-time event updates with signature verification
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 1. Get raw body and signature
    const body = await request.text();
    const signature = request.headers.get('x-eventbrite-signature');
    
    // Debug: Log all headers to help find webhook secret pattern
    console.log('[Webhook] Headers received:', Object.fromEntries(request.headers.entries()));
    
    // 2. Verify signature (security first)
    let signatureVerified = false;
    if (signature) {
      signatureVerified = verifyEventbriteSignature(body, signature);
      if (!signatureVerified) {
        console.warn('[Webhook] Invalid signature');
        Sentry.captureMessage('Webhook signature verification failed', 'warning');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } else {
      console.warn('[Webhook] No signature header - allowing for test webhooks');
      // For test webhooks, Eventbrite may not send signature
      signatureVerified = true; // Allow test webhooks to pass
    }

    // 3. Parse webhook payload
    let payload: WebhookPayload;
    try {
      payload = JSON.parse(body);
    } catch (error) {
      console.error('[Webhook] Invalid JSON payload:', error);
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // 4. Validate payload structure
    if (!payload.api_url || !payload.config?.action) {
      console.warn('[Webhook] Invalid payload structure:', payload);
      return NextResponse.json({ error: 'Invalid payload structure' }, { status: 400 });
    }

    // 5. Handle test webhooks specially
    if (payload.config.action === 'test') {
      console.log('[Webhook] Test webhook received - responding with success');
      return NextResponse.json({
        success: true,
        message: 'Test webhook received successfully',
        action: 'test',
        processingTimeMs: Date.now() - startTime
      }, { status: 200 });
    }

    // 6. Process the webhook (main business logic)
    console.log(`[Webhook] Processing ${payload.config.action} for ${payload.api_url}`);
    
    const result = await EventSyncService.processWebhook(
      'eventbrite',
      payload,
      signatureVerified
    );

    // 7. Log processing result
    console.log(`[Webhook] Processed in ${Date.now() - startTime}ms:`, {
      success: result.success,
      action: result.action,
      eventId: result.eventId,
      changes: result.changes?.length || 0,
      notifiedUsers: result.notifiedUsers || 0
    });

    // 8. Return success (Eventbrite expects 200)
    return NextResponse.json({
      success: true,
      processed: result.success,
      action: result.action,
      processingTimeMs: result.processingTimeMs
    }, { status: 200 });

  } catch (error) {
    // 9. Handle errors gracefully (considering Eventbrite's 10-retry policy)
    console.error('[Webhook] Processing failed:', error);
    
    Sentry.captureException(error, {
      tags: { service: 'webhook', source: 'eventbrite' },
      extra: { processingTimeMs: Date.now() - startTime }
    });

    // Determine if error is retryable or permanent
    const isRetryable = error instanceof Error && (
      error.message.includes('database') ||
      error.message.includes('timeout') ||
      error.message.includes('network')
    );

    if (isRetryable) {
      // Return 5xx for retryable errors (Eventbrite will retry up to 10 times)
      return NextResponse.json({
        success: false,
        error: 'Temporary processing error - will retry',
        processingTimeMs: Date.now() - startTime
      }, { status: 503 }); // Service Unavailable
    } else {
      // Return 200 for permanent errors (prevent unnecessary retries)
      return NextResponse.json({
        success: false,
        error: 'Permanent processing error',
        processingTimeMs: Date.now() - startTime
      }, { status: 200 });
    }
  }
}

/**
 * Health check endpoint for webhook registration
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'eventbrite-webhook',
    timestamp: new Date().toISOString()
  });
}

/**
 * Verify Eventbrite webhook signature
 * Uses HMAC SHA-256 as per Eventbrite documentation
 * Handles both production and test webhook scenarios
 */
function verifyEventbriteSignature(body: string, signature: string): boolean {
  const secret = process.env.EVENTBRITE_WEBHOOK_SECRET;
  
  if (!secret) {
    console.warn('[Webhook] EVENTBRITE_WEBHOOK_SECRET not configured - signature verification disabled');
    return true; // Allow webhooks without secret in development
  }

  try {
    // Remove 'sha256=' prefix if present (Eventbrite format)
    const cleanSignature = signature.replace(/^sha256=/, '');
    
    // Compute expected signature using webhook secret
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body, 'utf8')
      .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    const signatureBuffer = Buffer.from(cleanSignature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    
    // Ensure buffers are same length before comparison
    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);

  } catch (error) {
    console.error('[Webhook] Signature verification error:', error);
    return false;
  }
}
