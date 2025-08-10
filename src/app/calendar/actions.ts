// src/app/calendar/actions.ts
'use server';

import { createClient } from '@/utils/supabase/server';
import { UserEventService } from '@/services/userEventService';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';


// Import Rate Limiting packages
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';

const ratelimit = new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(10, '10 s'),
    analytics: true,
    prefix: 'ratelimit_kurecal',
});

// Zod schema for validating input
const TrackEventSchema = z.object({
    eventId: z.string().uuid(),
    status: z.enum(['bookmarked', 'attending', 'attended', 'cancelled']),
    notes: z.string().optional(),
});

const UntrackEventSchema = z.object({
    eventId: z.string().uuid(),
});

// Server Action for tracking an event
export async function trackEventAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: 'Authentication required.' };
    }

    // APPLY the rate limit
    const { success: rateLimitSuccess } = await ratelimit.limit(user.id);
    if (!rateLimitSuccess) {
        return { success: false, error: 'Too many requests. Please try again in a moment.' };
    }

    const validatedFields = TrackEventSchema.safeParse({
        eventId: formData.get('eventId'),
        status: formData.get('status'),
        notes: formData.get('notes'),
    });

    if (!validatedFields.success) {
        return { success: false, error: 'Invalid input.' };
    }

    const { eventId, status, notes } = validatedFields.data;

    try {
        await UserEventService.trackEvent(user.id, eventId, status, notes, supabase);
        revalidatePath('/calendar');
        revalidatePath('/dashboard');
        return { success: true };
    } catch (e) {
        const error = e as Error;
        return { success: false, error: error.message };
    }
}

export async function untrackEventAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: 'Authentication required.' };
    }

    // APPLY the rate limit here too
    const { success: rateLimitSuccess } = await ratelimit.limit(user.id);
    if (!rateLimitSuccess) {
        return { success: false, error: 'Too many requests. Please try again in a moment.' };
    }

    const validatedFields = UntrackEventSchema.safeParse({
        eventId: formData.get('eventId'),
    });

    if (!validatedFields.success) {
        return { success: false, error: 'Invalid input.' };
    }

    const { eventId } = validatedFields.data;

    try {
        await UserEventService.untrackEvent(user.id, eventId, supabase);
        revalidatePath('/calendar');
        revalidatePath('/dashboard');
        return { success: true };
    } catch (e) {
        const error = e as Error;
        return { success: false, error: error.message };
    }
}