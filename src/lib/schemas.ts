import { z } from 'zod';

export const LoginSchema = z.object({
    email: z.string().email({ message: "Please enter a valid email address." }),
    password: z.string().min(1, { message: "Password is required." }),
});

export const SignupSchema = z.object({
    name: z.string().min(2, { message: "Full name must be at least 2 characters." }),
    email: z.string().email({ message: "Please enter a valid email address." }),
    password: z.string().min(8, { message: "Password must be at least 8 characters long." }),
    confirmPassword: z.string(),
    acceptTerms: z.literal('on', {
        errorMap: () => ({ message: "You must accept the Terms of Service." })
    })
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
});

export const ForgotPasswordSchema = z.object({
    email: z.string().email({ message: "Please enter a valid email address." }),
});

export const ResetPasswordSchema = z.object({
    password: z.string().min(8, { message: "Password must be at least 8 characters long." }),
    confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
});

export const ProfileUpdateSchema = z.object({
    fullName: z.string().min(2, "Full name must be at least 2 characters.").optional().or(z.literal('')),
    timezone: z.string().optional(),
    username: z.string().min(3, "Username must be at least 3 characters.").optional().nullable(),
    headline: z.string().optional().nullable(),
    profileVisibility: z.enum(['public', 'private']).optional(),
    showAttendance: z.boolean().optional(),
});

// --- Event Schemas ---

export const EventTrackingSchema = z.object({
    eventId: z.string().min(1, "Event ID cannot be empty."), // Changed for flexibility
});

// Deprecated: Use BookmarkToggleSchema and AttendanceStatusSchema instead
export const EventStatusUpdateSchema = z.object({
    eventId: z.string().min(1, "Invalid event ID provided."),
    status: z.enum(['attending', 'attended', 'cancelled'], {  // 'bookmarked' removed
        errorMap: () => ({ message: "Invalid status provided." })
    }),
    notes: z.union([z.string(), z.null()]).optional().transform(val => val === null ? undefined : val),
});

// New schema for bookmark toggle
export const BookmarkToggleSchema = z.object({
    eventId: z.string().min(1, "Invalid event ID provided."),
});

// New schema for attendance status (independent of bookmarking)
export const AttendanceStatusSchema = z.object({
    eventId: z.string().min(1, "Invalid event ID provided."),
    status: z.enum(['attending', 'attended', 'cancelled']).nullable().optional(),  // Can be null to clear status
    notes: z.union([z.string(), z.null()]).optional().transform(val => val === null ? undefined : val),
});

export const ContactFormSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    email: z.string().email("Invalid email address."),
    subject: z.string().min(5, "Subject must be at least 5 characters."),
    message: z.string().min(10, "Message must be at least 10 characters."),
    company: z.string().optional(),
});

export const EventIdSchema = z.object({
    // Also updated this schema for consistency.
    eventId: z.string().min(1, "Invalid event ID format."),
});