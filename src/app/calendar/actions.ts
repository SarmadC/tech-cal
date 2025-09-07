'use server'

import { createClient } from '@/utils/supabase/server';
import { UserEventService } from '@/services/userEventService';
import { revalidatePath } from 'next/cache';
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';

// Import the correct, centralized schemas
import { EventStatusUpdateSchema, EventIdSchema } from '@/lib/schemas';

// Initialize the rate limiter
const ratelimit = new Ratelimit({
    redis: kv,
    // Allow 10 requests per 10 seconds per user ID
    limiter: Ratelimit.slidingWindow(10, '10 s'), 
    analytics: true,
    prefix: 'ratelimit_kurecal_calendar',
});

// --- Server Action for tracking an event ---
export async function trackEventAction(formData: FormData) {
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Authentication required." };
  }
  

  // Apply rate limiting
  const { success: rateLimitSuccess } = await ratelimit.limit(user.id);
  if (!rateLimitSuccess) {
      return { success: false, error: 'Too many requests. Please try again in a moment.' };
  }

  // Use the correct schema for validation
  const validationResult = EventStatusUpdateSchema.safeParse({
    eventId: formData.get('eventId'),
    status: formData.get('status'),
    notes: formData.get('notes'), // Include notes if they are passed
  });

  if (!validationResult.success) {
    console.error("Validation failed:", validationResult.error.flatten().fieldErrors);
    return { success: false, error: "Invalid input data provided." };
  }

  const { eventId, status, notes } = validationResult.data;

  try {
    await UserEventService.trackEvent(user.id, eventId, status, notes, supabase);
    revalidatePath('/calendar');
    revalidatePath('/dashboard');
    return { success: true, message: "Event tracked successfully." };

  } catch (error) {
    console.error("Error tracking event:", error);
    // You can use a generic message or pass the actual error message
    return { success: false, error: (error as Error).message || "A server error occurred." };
  }
}


// --- Server Action for untracking an event ---
export async function untrackEventAction(formData: FormData) {
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: 'Authentication required.' };
    }
    

    // Apply rate limiting
    const { success: rateLimitSuccess } = await ratelimit.limit(user.id);
    if (!rateLimitSuccess) {
        return { success: false, error: 'Too many requests. Please try again in a moment.' };
    }

    // Use the reusable EventIdSchema for validation
    const validationResult = EventIdSchema.safeParse({
        eventId: formData.get('eventId'),
    });

    if (!validationResult.success) {
        console.error("Validation failed:", validationResult.error.flatten().fieldErrors);
        return { success: false, error: 'Invalid input data provided.' };
    }

    const { eventId } = validationResult.data;

    try {
        await UserEventService.untrackEvent(user.id, eventId, supabase);
        revalidatePath('/calendar');
        revalidatePath('/dashboard'); // Untracking might affect dashboard stats
        return { success: true, message: 'Event untracked successfully.' };
    } catch (error) {
        console.error("Error untracking event:", error);
        return { success: false, error: (error as Error).message || "A server error occurred." };
    }
}