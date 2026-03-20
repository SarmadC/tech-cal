'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { MaterialIcon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

const EVENT_TYPES = [
    { value: 'tech_event', label: 'Tech Event' },
    { value: 'hackathon', label: 'Hackathon' },
    { value: 'meetup', label: 'Meetup' },
    { value: 'conference', label: 'Conference' },
    { value: 'workshop', label: 'Workshop' },
    { value: 'other', label: 'Other' },
];

interface FormState {
    title: string;
    description: string;
    event_type: string;
    start_date: string;
    start_time: string;
    end_date: string;
    end_time: string;
    is_virtual: boolean;
    location: string;
    registration_url: string;
    organizer_name: string;
    tags_input: string;
}

const INITIAL: FormState = {
    title: '',
    description: '',
    event_type: 'tech_event',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    is_virtual: false,
    location: '',
    registration_url: '',
    organizer_name: '',
    tags_input: '',
};

function combineDateTime(date: string, time: string): string | null {
    if (!date) return null;
    if (!time) return `${date}T00:00:00`;
    return `${date}T${time}:00`;
}

interface FieldProps {
    label: string;
    required?: boolean;
    children: React.ReactNode;
    hint?: string;
}

function Field({ label, required, children, hint }: FieldProps) {
    return (
        <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-white/70">
                {label}
                {required && <span className="text-rose-400 ml-0.5">*</span>}
            </label>
            {children}
            {hint && <p className="text-[11px] text-white/30">{hint}</p>}
        </div>
    );
}

const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors';

export default function SubmitEventForm() {
    const router = useRouter();
    const [form, setForm] = useState<FormState>(INITIAL);
    const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const update = (field: keyof FormState, value: string | boolean) =>
        setForm((f) => ({ ...f, [field]: value }));

    const validate = (): boolean => {
        const errs: typeof errors = {};
        if (!form.title.trim()) errs.title = 'Title is required';
        if (!form.start_date) errs.start_date = 'Start date is required';
        if (!form.is_virtual && !form.location.trim()) errs.location = 'Location is required for in-person events';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setSubmitting(true);
        try {
            const tags = form.tags_input
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean);

            const body = {
                title: form.title.trim(),
                description: form.description.trim() || null,
                event_type: form.event_type,
                start_date: combineDateTime(form.start_date, form.start_time),
                end_date: combineDateTime(form.end_date, form.end_time),
                is_virtual: form.is_virtual,
                location: form.is_virtual ? null : form.location.trim() || null,
                registration_url: form.registration_url.trim() || null,
                organizer_name: form.organizer_name.trim() || null,
                tags,
            };

            const res = await fetch('/api/events/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Submission failed');
            }

            setSuccess(true);
        } catch (err) {
            setErrors({ title: err instanceof Error ? err.message : 'Submission failed' });
        } finally {
            setSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center space-y-4">
                <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/15 flex items-center justify-center">
                    <MaterialIcon name="check" size={24} className="text-emerald-400" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-white">Submission received!</h2>
                    <p className="text-sm text-white/50 mt-1">
                        Our team will review your event and publish it shortly. Thank you for contributing!
                    </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                    <Button
                        variant="ghost"
                        className="border border-white/10 text-white/70 hover:text-white"
                        onClick={() => {
                            setForm(INITIAL);
                            setErrors({});
                            setSuccess(false);
                        }}
                    >
                        Submit another
                    </Button>
                    <Button
                        className="bg-white/10 hover:bg-white/15 text-white"
                        onClick={() => router.push('/discover')}
                    >
                        Browse events
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-5">
                <h2 className="text-sm font-medium text-white/60 uppercase tracking-wide">Event details</h2>

                <Field label="Event title" required>
                    <input
                        type="text"
                        value={form.title}
                        onChange={(e) => update('title', e.target.value)}
                        placeholder="e.g. SF React Meetup — March 2026"
                        className={cn(inputClass, errors.title && 'border-rose-500/50')}
                    />
                    {errors.title && <p className="text-[11px] text-rose-400 mt-1">{errors.title}</p>}
                </Field>

                <Field label="Event type" required>
                    <div className="flex flex-wrap gap-2">
                        {EVENT_TYPES.map((t) => (
                            <button
                                key={t.value}
                                type="button"
                                onClick={() => update('event_type', t.value)}
                                className={cn(
                                    'px-3 py-1.5 rounded-lg text-[13px] border transition-colors',
                                    form.event_type === t.value
                                        ? 'bg-white/10 border-white/30 text-white'
                                        : 'border-white/10 text-white/40 hover:text-white/60 hover:border-white/20'
                                )}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </Field>

                <Field label="Description">
                    <textarea
                        value={form.description}
                        onChange={(e) => update('description', e.target.value)}
                        placeholder="Brief description of what attendees can expect…"
                        rows={3}
                        className={cn(inputClass, 'resize-none')}
                    />
                </Field>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-5">
                <h2 className="text-sm font-medium text-white/60 uppercase tracking-wide">Date & location</h2>

                <div className="grid grid-cols-2 gap-4">
                    <Field label="Start date" required>
                        <input
                            type="date"
                            value={form.start_date}
                            onChange={(e) => update('start_date', e.target.value)}
                            className={cn(inputClass, errors.start_date && 'border-rose-500/50')}
                        />
                        {errors.start_date && <p className="text-[11px] text-rose-400 mt-1">{errors.start_date}</p>}
                    </Field>
                    <Field label="Start time">
                        <input
                            type="time"
                            value={form.start_time}
                            onChange={(e) => update('start_time', e.target.value)}
                            className={inputClass}
                        />
                    </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Field label="End date">
                        <input
                            type="date"
                            value={form.end_date}
                            onChange={(e) => update('end_date', e.target.value)}
                            className={inputClass}
                        />
                    </Field>
                    <Field label="End time">
                        <input
                            type="time"
                            value={form.end_time}
                            onChange={(e) => update('end_time', e.target.value)}
                            className={inputClass}
                        />
                    </Field>
                </div>

                <Field label="Format">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => update('is_virtual', false)}
                            className={cn(
                                'px-3 py-1.5 rounded-lg text-[13px] border transition-colors',
                                !form.is_virtual
                                    ? 'bg-white/10 border-white/30 text-white'
                                    : 'border-white/10 text-white/40 hover:text-white/60 hover:border-white/20'
                            )}
                        >
                            In-person
                        </button>
                        <button
                            type="button"
                            onClick={() => update('is_virtual', true)}
                            className={cn(
                                'px-3 py-1.5 rounded-lg text-[13px] border transition-colors',
                                form.is_virtual
                                    ? 'bg-white/10 border-white/30 text-white'
                                    : 'border-white/10 text-white/40 hover:text-white/60 hover:border-white/20'
                            )}
                        >
                            Virtual
                        </button>
                    </div>
                </Field>

                {!form.is_virtual && (
                    <Field label="Location" required>
                        <input
                            type="text"
                            value={form.location}
                            onChange={(e) => update('location', e.target.value)}
                            placeholder="e.g. San Francisco, CA"
                            className={cn(inputClass, errors.location && 'border-rose-500/50')}
                        />
                        {errors.location && <p className="text-[11px] text-rose-400 mt-1">{errors.location}</p>}
                    </Field>
                )}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-5">
                <h2 className="text-sm font-medium text-white/60 uppercase tracking-wide">Additional info</h2>

                <Field label="Organizer name">
                    <input
                        type="text"
                        value={form.organizer_name}
                        onChange={(e) => update('organizer_name', e.target.value)}
                        placeholder="Who is organizing this event?"
                        className={inputClass}
                    />
                </Field>

                <Field label="Registration / event URL">
                    <input
                        type="url"
                        value={form.registration_url}
                        onChange={(e) => update('registration_url', e.target.value)}
                        placeholder="https://…"
                        className={inputClass}
                    />
                </Field>

                <Field
                    label="Tags"
                    hint="Comma-separated, e.g. React, TypeScript, AI"
                >
                    <input
                        type="text"
                        value={form.tags_input}
                        onChange={(e) => update('tags_input', e.target.value)}
                        placeholder="React, TypeScript, AI…"
                        className={inputClass}
                    />
                </Field>
            </div>

            <Button
                type="submit"
                disabled={submitting}
                className="w-full h-11 bg-white text-black hover:bg-white/90 font-medium"
            >
                {submitting ? 'Submitting…' : 'Submit event for review'}
            </Button>
        </form>
    );
}
