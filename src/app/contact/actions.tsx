'use server'

import { Resend } from 'resend';
import { ContactFormEmail } from '@/components/emails/ContactFormEmail';
import { ContactFormSchema } from '@/lib/schemas'; // Import from central location
import { getPostHogClient } from '@/lib/posthog-server';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

export type ContactFormState = {
    message: string;
    errors?: {
        name?: string[];
        email?: string[];
        company?: string[];
        subject?: string[];
        message?: string[];
        _form?: string[];
    };
    success: boolean;
}

export async function submitContactFormAction(
    prevState: ContactFormState,
    formData: FormData
): Promise<ContactFormState> {
    // Add a check for the Resend API Key to prevent runtime errors
    if (!process.env.RESEND_API_KEY) {
        console.error("RESEND_API_KEY is not configured.");
        return {
            success: false,
            message: "Server Configuration Error.",
            errors: { _form: ["The contact form is currently unavailable."] }
        }
    }

    // Validate form data
    const validatedFields = ContactFormSchema.safeParse({
        name: formData.get('name'),
        email: formData.get('email'),
        company: formData.get('company'),
        subject: formData.get('subject'),
        message: formData.get('message'),
    });

    if (!validatedFields.success) {
        return {
            success: false,
            message: "Validation failed. Please check the fields for errors.",
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    // Send the email within a try...catch block
    try {
        const { name, email, company, subject, message } = validatedFields.data;
        
        await resend.emails.send({
            from: 'Kure-Cal Contact Form <noreply@kure-cal.com>', // Your correct setting
            to: ['sarmad@kure-cal.com'],
            subject: `New Contact Form Message: ${subject}`,
            replyTo: email, // Your correct setting
            react: <ContactFormEmail name={name} email={email} company={company} subject={subject} message={message} />,
        });

        // Track contact form submission
        try {
            const posthog = getPostHogClient();
            posthog.capture({
                distinctId: email,
                event: 'contact_form_submitted',
                properties: {
                    subject: subject,
                    has_company: !!company,
                    source: 'server_action',
                }
            });
        } catch (posthogError) {
            console.error('[PostHog] Failed to track contact form submission:', posthogError);
        }

        return {
            success: true,
            message: "Thank you for your message! We'll get back to you soon.",
        };
    } catch (error) {
        console.error("Email sending error:", error);
        return {
            success: false,
            message: "Server Error.",
            errors: { _form: ["Failed to send your message. Please try again later."] },
        };
    }
}