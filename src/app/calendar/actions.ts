'use server'

import { createClient } from '@/utils/supabase/server';
import { UserEventService } from '@/services/userEventService';
import { revalidatePath } from 'next/cache';
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';

// Import the correct, centralized schemas
import { EventStatusUpdateSchema, EventIdSchema, BookmarkToggleSchema, AttendanceStatusSchema } from '@/lib/schemas';
import type { EventStatus } from '@/types';

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

// --- Server Action for toggling bookmark ---
export async function toggleBookmarkAction(formData: FormData) {
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

    // Get current bookmark state to determine toggle direction
    const eventId = formData.get('eventId')?.toString();
    const currentState = formData.get('currentState')?.toString(); // 'true' or 'false' or 'unknown'
    
    // If current state not provided, check in database
    let isBookmarked = false;
    if (currentState === 'true' || currentState === 'false') {
        isBookmarked = currentState === 'true';
    } else if (eventId) {
        // Fetch current state from database
        const { data } = await supabase
            .from('user_events')
            .select('is_bookmarked')
            .eq('user_id', user.id)
            .eq('event_id', eventId)
            .single();
        isBookmarked = data?.is_bookmarked ?? false;
    }

    // Validate eventId
    const validationResult = BookmarkToggleSchema.safeParse({
        eventId: eventId,
    });

    if (!validationResult.success) {
        console.error("Validation failed:", validationResult.error.flatten().fieldErrors);
        return { success: false, error: "Invalid input data provided." };
    }

    const { eventId: validEventId } = validationResult.data;

    try {
        // Toggle bookmark (true -> false, false -> true)
        const result = await UserEventService.toggleBookmark(
            user.id, 
            validEventId, 
            !isBookmarked,  // Toggle to opposite state
            supabase
        );
        revalidatePath('/calendar');
        revalidatePath('/dashboard');
        return { 
            success: true, 
            message: result.isBookmarked ? "Event bookmarked" : "Event unbookmarked",
            wasBookmarked: result.wasBookmarked,
            isBookmarked: result.isBookmarked,
            isNewRow: result.isNewRow
        };
    } catch (error) {
        console.error("Error toggling bookmark:", error);
        return { success: false, error: (error as Error).message || "A server error occurred." };
    }
}

// --- Server Action for setting attendance status ---
export async function setAttendanceAction(formData: FormData) {
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

    // Use the new schema for validation
    const validationResult = AttendanceStatusSchema.safeParse({
        eventId: formData.get('eventId'),
        status: formData.get('status'), // Can be null to clear status
        notes: formData.get('notes'),
    });

    if (!validationResult.success) {
        console.error("Validation failed:", validationResult.error.flatten().fieldErrors);
        return { success: false, error: "Invalid input data provided." };
    }

    const { eventId, status, notes } = validationResult.data;

    try {
        const result = await UserEventService.setAttendanceStatus(
            user.id,
            eventId,
            status as EventStatus | null,
            notes,
            supabase
        );
        revalidatePath('/calendar');
        revalidatePath('/dashboard');
        return { 
            success: true, 
            message: "Attendance status updated successfully.",
            previousStatus: result.previousStatus,
            newStatus: result.newStatus,
            autoBookmarked: result.autoBookmarked
        };
    } catch (error) {
        console.error("Error setting attendance status:", error);
        return { success: false, error: (error as Error).message || "A server error occurred." };
    }
}