// src/app/contact/page.tsx
'use client';

// 1. CORRECTED IMPORTS
import { useEffect, useRef, useActionState } from 'react'; // Core hooks from 'react'
import { useFormStatus } from 'react-dom';              // DOM-specific hooks from 'react-dom'

import { submitContactFormAction, type ContactFormState } from './actions';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { Button } from '@/components/ui/button';
import { CircleNotchIcon } from '@phosphor-icons/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Helper component for the submit button to show a pending state
function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button 
            type="submit" 
            disabled={pending} 
            className="w-full bg-accent-primary hover:bg-accent-primary-hover !text-accent-primary-foreground"
        >
            {pending && <CircleNotchIcon className="mr-2 h-4 w-4 animate-spin" />}
            {pending ? 'Sending...' : 'Send Message'}
        </Button>
    );
}

export default function ContactPage() {
    const formRef = useRef<HTMLFormElement>(null);
    const { showSuccess, showError } = useSnackbar();
    const initialState: ContactFormState = { message: '', success: false, errors: {} };

    // 2. RENAME useFormState to useActionState
    const [state, formAction] = useActionState(submitContactFormAction, initialState);

    // Effect to show snackbar notifications based on the form action's state
    useEffect(() => {
        if (state.message) {
            if (state.success) {
                showSuccess(`Message Sent! ${state.message}`);
                // Reset the form on successful submission
                formRef.current?.reset();
            } else {
                // Combine all errors for a more descriptive snackbar
                const errorDescription = Object.values(state.errors || {}).flat().join(' ');
                showError(`Submission Failed: ${errorDescription || state.message}`);
            }
        }
    }, [state, showSuccess, showError]);

    return (
        <div className="min-h-screen bg-background-main pt-20">
            {/* Header section (unchanged) */}
            <section className="py-16 px-4 bg-background-secondary">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-4xl md:text-5xl font-bold text-foreground-primary mb-6">
                        Get in Touch
                    </h1>
                    <p className="text-xl text-foreground-secondary max-w-3xl">
                        Have questions about KureCal? Want to discuss enterprise plans?
                        We are here to help.
                    </p>
                </div>
            </section>

            <div className="max-w-7xl mx-auto px-4 py-12">
                <div className="grid lg:grid-cols-2 gap-12">
                    {/* Contact Information section (unchanged) */}
                    <div>
                        <h2 className="text-2xl font-bold text-foreground-primary mb-6">
                            Let`&apos;`s Build Something Together
                        </h2>
                        <p className="text-foreground-secondary mb-8">
                            Whether you are a developer with feedback, a company looking for custom solutions,
                            or an investor interested in our vision, we would love to hear from you.
                        </p>
                        {/* ... your existing contact info divs ... */}
                    </div>

                    {/* Contact Form section */}
                    <div className="bg-background-secondary rounded-2xl p-8 border border-border-default">
                        <form ref={formRef} action={formAction} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-foreground-secondary mb-2">Name *</label>
                                    <input type="text" id="name" name="name" required className="w-full px-4 py-2.5 bg-background-main border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary" />
                                    {state.errors?.name && <p className="text-red-500 text-sm mt-1">{state.errors.name[0]}</p>}
                                </div>
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-foreground-secondary mb-2">Email *</label>
                                    <input type="email" id="email" name="email" required className="w-full px-4 py-2.5 bg-background-main border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary" />
                                    {state.errors?.email && <p className="text-red-500 text-sm mt-1">{state.errors.email[0]}</p>}
                                </div>
                            </div>
                            <div>
                                <label htmlFor="company" className="block text-sm font-medium text-foreground-secondary mb-2">Company</label>
                                <input type="text" id="company" name="company" className="w-full px-4 py-2.5 bg-background-main border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary" />
                            </div>
                            <div>
                                <label htmlFor="subject" className="block text-sm font-medium text-foreground-secondary mb-2">Subject *</label>
                                <Select name="subject" required>
                                    <SelectTrigger id="subject" className="w-full bg-background-main border-border-default text-foreground-secondary">
                                        <SelectValue placeholder="Select a subject..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="general">General Inquiry</SelectItem>
                                        <SelectItem value="sales">Enterprise Sales</SelectItem>
                                        <SelectItem value="support">Technical Support</SelectItem>
                                        <SelectItem value="partnership">Partnership</SelectItem>
                                        <SelectItem value="investment">Investment Opportunity</SelectItem>
                                    </SelectContent>
                                </Select>
                                {state.errors?.subject && <p className="text-red-500 text-sm mt-1">{state.errors.subject[0]}</p>}
                            </div>
                            <div>
                                <label htmlFor="message" className="block text-sm font-medium text-foreground-secondary mb-2">Message *</label>
                                <textarea id="message" name="message" required rows={4} className="w-full px-4 py-2.5 bg-background-main border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary resize-none" placeholder="Tell us more about how we can help..." />
                                {state.errors?.message && <p className="text-red-500 text-sm mt-1">{state.errors.message[0]}</p>}
                            </div>
                            <SubmitButton />
                            <p className="text-xs text-foreground-tertiary text-center">
                                By submitting this form, you agree to our privacy policy and terms of service.
                            </p>
                            {state.errors?._form && (
                                <div className="mt-2 text-sm text-red-500 text-center" aria-live="polite">
                                    {state.errors._form[0]}
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}