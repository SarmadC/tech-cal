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
});

// --- Event Schemas ---

export const EventTrackingSchema = z.object({
    eventId: z.string().min(1, "Event ID cannot be empty."), // Changed for flexibility
});

export const EventStatusUpdateSchema = z.object({
    // --- FIX IS HERE ---
    // We now validate that it's a non-empty string, not strictly a UUID.
    // This makes the backend more robust against different ID formats in your database.
    eventId: z.string().min(1, "Invalid event ID provided."),
    status: z.enum(['bookmarked', 'attending', 'attended', 'cancelled'], {
        errorMap: () => ({ message: "Invalid status provided." })
    }),
    notes: z.string().optional(),
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