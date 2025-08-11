// src/lib/schemas.ts

import { z } from 'zod';

// --- Auth Schemas ---

export const LoginSchema = z.object({
    email: z.string().email({ message: "Please enter a valid email address." }),
    password: z.string().min(1, { message: "Password is required." }),
});

export const SignupSchema = z.object({
    name: z.string().min(2, { message: "Full name must be at least 2 characters." }),
    email: z.string().email({ message: "Please enter a valid email address." }),
    password: z.string().min(8, { message: "Password must be at least 8 characters long." }),
    confirmPassword: z.string(),
    // HTML forms submit the value "on" for a checked checkbox.
    // We validate that the 'on' value is present, meaning the box was checked.
    acceptTerms: z.literal('on', { 
        errorMap: () => ({ message: "You must accept the Terms of Service." })
    })
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"], // Apply the error to the confirmPassword field
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


// --- Profile Schemas ---

export const ProfileUpdateSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters.").optional().or(z.literal('')),
  timezone: z.string().optional(),
});


// --- Event Schemas ---

export const EventTrackingSchema = z.object({
  eventId: z.string().uuid("Invalid event ID format."),
});

export const EventStatusUpdateSchema = z.object({
  eventId: z.string().uuid("Invalid event ID format."),
  status: z.enum(['bookmarked', 'attending', 'attended', 'cancelled'], {
    errorMap: () => ({ message: "Invalid status provided." })
  }),
  // Notes are optional
  notes: z.string().optional(),
});

// --- Other Schemas ---

export const ContactFormSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    email: z.string().email("Invalid email address."),
    subject: z.string().min(5, "Subject must be at least 5 characters."),
    message: z.string().min(10, "Message must be at least 10 characters."),
    company: z.string().optional(),
});


// Use this for any action that just needs a valid event ID
export const EventIdSchema = z.object({
  eventId: z.string().uuid("Invalid event ID format."),
});

