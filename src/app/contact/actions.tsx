// src/app/contact/actions.ts
'use server'

import { z } from 'zod';
import { Resend } from 'resend';
import { ContactFormEmail } from '@/components/emails/ContactFormEmail';

const resend = new Resend(process.env.RESEND_API_KEY);

const ContactSchema = z.object({
    name: z.string().min(2, { message: "Please enter your name." }),
    email: z.string().email({ message: "Please enter a valid email address." }),
    company: z.string().optional(),
    subject: z.string().min(1, { message: "Please select a subject." }),
    message: z.string().min(10, { message: "Message must be at least 10 characters." }),
});

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
    const validatedFields = ContactSchema.safeParse({
        name: formData.get('name'),
        email: formData.get('email'),
        company: formData.get('company'),
        subject: formData.get('subject'),
        message: formData.get('message'),
    });

    if (!validatedFields.success) {
        return {
            success: false,
            message: "Validation failed.",
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    try {
        const { name, email, company, subject, message } = validatedFields.data;
        const toEmail = 'sarmad@kure-cal.com';

        await resend.emails.send({
            from: 'Kure-Cal Contact Form <noreply@kure-cal.com>',
            to: [toEmail],
            subject: `New Contact Form Message: ${subject}`,
            replyTo: email,
            react: <ContactFormEmail name={name} email={email} company={company} subject={subject} message={message} />,
        });

        return {
            success: true,
            message: "Thank you for your message! We'll get back to you soon.",
        };
    } catch (error) {
        console.error("Email sending error:", error);
        return {
            success: false,
            message: "Server Error.",
            errors: { _form: ["Failed to send message. Please try again later."] },
        };
    }
}