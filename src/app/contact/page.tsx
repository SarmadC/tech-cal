// src/app/contact/page.tsx
'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useEffect, useRef } from 'react';
import { submitContactFormAction, type ContactFormState } from './actions';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

// Helper component for the submit button to show a pending state
function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="w-full">
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {pending ? 'Sending...' : 'Send Message'}
        </Button>
    );
}

export default function ContactPage() {
    const formRef = useRef<HTMLFormElement>(null);
    const initialState: ContactFormState = { message: '', success: false, errors: {} };
    const [state, formAction] = useFormState(submitContactFormAction, initialState);

    // Effect to show toasts based on the form action's state
    useEffect(() => {
        if (state.message) {
            if (state.success) {
                toast.success("Message Sent!", { description: state.message });
                // Reset the form on successful submission
                formRef.current?.reset();
            } else {
                // Combine all errors for a more descriptive toast
                const errorDescription = Object.values(state.errors || {}).flat().join(' ');
                toast.error("Submission Failed", { description: errorDescription || state.message });
            }
        }
    }, [state]);

    return (
        <div className="min-h-screen bg-background-main pt-20">
            {/* Header section (unchanged) */}
            <section className="py-16 px-4 bg-background-secondary">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-4xl md:text-5xl font-bold text-foreground-primary mb-6">
                        Get in Touch
                    </h1>
                    <p className="text-xl text-foreground-secondary max-w-3xl">
                        Have questions about TechCalendar? Want to discuss enterprise plans?
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
                    <div className="bg-background-secondary rounded-2xl p-8 border border-border-color">
                        <form ref={formRef} action={formAction} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-foreground-primary mb-2">Name *</label>
                                    <input type="text" id="name" name="name" required className="w-full px-4 py-2.5 bg-background-main border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary" />
                                    {state.errors?.name && <p className="text-red-500 text-sm mt-1">{state.errors.name[0]}</p>}
                                </div>
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-foreground-primary mb-2">Email *</label>
                                    <input type="email" id="email" name="email" required className="w-full px-4 py-2.5 bg-background-main border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary" />
                                    {state.errors?.email && <p className="text-red-500 text-sm mt-1">{state.errors.email[0]}</p>}
                                </div>
                            </div>
                            <div>
                                <label htmlFor="company" className="block text-sm font-medium text-foreground-primary mb-2">Company</label>
                                <input type="text" id="company" name="company" className="w-full px-4 py-2.5 bg-background-main border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary" />
                            </div>
                            <div>
                                <label htmlFor="subject" className="block text-sm font-medium text-foreground-primary mb-2">Subject *</label>
                                <select id="subject" name="subject" required defaultValue="general" className="w-full px-4 py-2.5 bg-background-main border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary">
                                    <option value="general">General Inquiry</option>
                                    <option value="sales">Enterprise Sales</option>
                                    <option value="support">Technical Support</option>
                                    <option value="partnership">Partnership</option>
                                    <option value="investment">Investment Opportunity</option>
                                </select>
                                {state.errors?.subject && <p className="text-red-500 text-sm mt-1">{state.errors.subject[0]}</p>}
                            </div>
                            <div>
                                <label htmlFor="message" className="block text-sm font-medium text-foreground-primary mb-2">Message *</label>
                                <textarea id="message" name="message" required rows={4} className="w-full px-4 py-2.5 bg-background-main border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary resize-none" placeholder="Tell us more about how we can help..." />
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