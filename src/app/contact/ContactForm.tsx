'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { submitContactFormAction, type ContactFormState } from './actions';
import {
    CircleNotchIcon,
    PaperPlaneRight,
    ArrowUpRight,
    WarningCircle,
    CheckCircle,
} from '@phosphor-icons/react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

type ContactFormProps = {
    initialSubject?: string;
    onClose?: () => void;
};

function SubmitButton({ disabled }: { disabled?: boolean }) {
    const { pending } = useFormStatus();

    return (
        <button
            type="submit"
            disabled={pending || disabled}
            className={cn(
                "group relative inline-flex items-center justify-center gap-2 h-10 px-6",
                "bg-white text-black font-medium text-[13px] rounded-md transition-all duration-200",
                "hover:bg-[#E5E5E5] active:scale-[0.98]",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "shadow-[0_1px_2px_rgba(0,0,0,0.1)]"
            )}
        >
            {pending ? (
                <CircleNotchIcon className="w-4 h-4 animate-spin" />
            ) : (
                <>
                    Send message
                    <PaperPlaneRight className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" weight="fill" />
                </>
            )}
        </button>
    );
}

export function ContactForm({ initialSubject = '', onClose }: ContactFormProps) {
    const formRef = useRef<HTMLFormElement>(null);
    const { showSuccess, showError } = useSnackbar();
    const initialState: ContactFormState = { message: '', success: false, errors: {} };
    const [state, formAction] = useActionState(submitContactFormAction, initialState);
    const [selectedSubject, setSelectedSubject] = useState(initialSubject);
    const [pageUrl, setPageUrl] = useState('');
    const [referrer, setReferrer] = useState('');

    // Update internal state if prop changes
    useEffect(() => {
        if (initialSubject) {
            setSelectedSubject(initialSubject);
        }
    }, [initialSubject]);

    useEffect(() => {
        setPageUrl(window.location.href);
        setReferrer(document.referrer);
    }, []);

    useEffect(() => {
        if (state.message) {
            if (state.success) {
                showSuccess('Message sent successfully');
                formRef.current?.reset();
                setSelectedSubject('');
                if (onClose) {
                    setTimeout(onClose, 2000);
                }
            } else {
                // We handle field errors inline, but show general error via snackbar too if needed
                if (state.errors?._form) {
                    showError(state.errors._form[0]);
                } else if (!state.success && state.message) {
                    showError(state.message);
                }
            }
        }
    }, [state, showSuccess, showError, onClose]);

    const inputClasses = cn(
        "w-full h-[42px] px-3 bg-[#16181A] text-[14px] text-white",
        "border border-[#2D3136] rounded-lg", // 1px border at low opacity
        "placeholder:text-[#585C66]",
        "focus:outline-none focus:border-[#5E6AD2] focus:ring-1 focus:ring-[#5E6AD2]", // Desaturated blue accent
        "transition-all duration-200 ease-out",
        "hover:border-[#3F444D]"
    );

    const labelClasses = "block text-[12px] font-medium text-[#8A8F98] mb-1.5 ml-0.5";
    const errorClasses = "text-[#D85656] text-[11px] mt-1.5 flex items-center gap-1";

    return (
        <div className="w-full max-w-[600px] mx-auto">
            <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#121315] shadow-[0_8px_32px_rgba(0,0,0,0.24)]">

                {/* Header */}
                <div className="px-8 pt-8 pb-6 border-b border-white/[0.04]">
                    <h3 className="text-[18px] font-medium text-white mb-1 tracking-tight">
                        Contact Support
                    </h3>
                    <p className="text-[14px] text-[#8A8F98]">
                        We usually respond within a few hours.
                    </p>
                </div>

                <div className="p-8">
                    <form ref={formRef} action={formAction} className="space-y-6">
                        <input type="hidden" name="pageUrl" value={pageUrl} />
                        <input type="hidden" name="referrer" value={referrer} />

                        {/* Name & Email Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-0.5">
                                <label htmlFor="name" className={labelClasses}>
                                    Name
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    required
                                    className={cn(inputClasses, state.errors?.name && "border-[#D85656] focus:border-[#D85656] focus:ring-[#D85656]")}
                                    placeholder="Jane Doe"
                                />
                                {state.errors?.name && (
                                    <p className={errorClasses}>
                                        <WarningCircle weight="fill" /> {state.errors.name[0]}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-0.5">
                                <label htmlFor="email" className={labelClasses}>
                                    Email
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    required
                                    className={cn(inputClasses, state.errors?.email && "border-[#D85656] focus:border-[#D85656] focus:ring-[#D85656]")}
                                    placeholder="jane@company.com"
                                />
                                {state.errors?.email && (
                                    <p className={errorClasses}>
                                        <WarningCircle weight="fill" /> {state.errors.email[0]}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Company (Optional) */}
                        <div className="space-y-0.5">
                            <label htmlFor="company" className={labelClasses}>
                                Company <span className="text-[#585C66] font-normal ml-1">(Optional)</span>
                            </label>
                            <input
                                type="text"
                                id="company"
                                name="company"
                                className={inputClasses}
                                placeholder="Acme Inc."
                            />
                        </div>

                        {/* Subject Select */}
                        <div className="space-y-0.5">
                            <label htmlFor="subject" className={labelClasses}>
                                Subject
                            </label>
                            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                                <SelectTrigger
                                    className={cn(
                                        inputClasses,
                                        "flex w-full items-center justify-between",
                                        state.errors?.subject && "border-[#D85656] focus:border-[#D85656] focus:ring-[#D85656]"
                                    )}
                                >
                                    <SelectValue placeholder="Select a topic..." />
                                </SelectTrigger>
                                <SelectContent className="bg-[#16181A] border border-[#2D3136] text-white rounded-lg shadow-xl overflow-hidden min-w-[var(--radix-select-trigger-width)]">
                                    <SelectItem value="general" className="focus:bg-[#2D3136] focus:text-white cursor-pointer py-2.5 px-3 text-[13px]">General Inquiry</SelectItem>
                                    <SelectItem value="sales" className="focus:bg-[#2D3136] focus:text-white cursor-pointer py-2.5 px-3 text-[13px]">Enterprise Sales</SelectItem>
                                    <SelectItem value="support" className="focus:bg-[#2D3136] focus:text-white cursor-pointer py-2.5 px-3 text-[13px]">Technical Support</SelectItem>
                                    <SelectItem value="bug_report" className="focus:bg-[#2D3136] focus:text-white cursor-pointer py-2.5 px-3 text-[13px]">Bug Report</SelectItem>
                                    <SelectItem value="feedback" className="focus:bg-[#2D3136] focus:text-white cursor-pointer py-2.5 px-3 text-[13px]">Feature Request / Feedback</SelectItem>
                                    <SelectItem value="partnership" className="focus:bg-[#2D3136] focus:text-white cursor-pointer py-2.5 px-3 text-[13px]">Partnership</SelectItem>
                                </SelectContent>
                            </Select>
                            <input type="hidden" name="subject" value={selectedSubject} />
                            {state.errors?.subject && (
                                <p className={errorClasses}>
                                    <WarningCircle weight="fill" /> {state.errors.subject[0]}
                                </p>
                            )}
                        </div>

                        {/* Message Textarea */}
                        <div className="space-y-0.5">
                            <label htmlFor="message" className={labelClasses}>
                                Message
                            </label>
                            <textarea
                                id="message"
                                name="message"
                                required
                                rows={5}
                                className={cn(
                                    inputClasses,
                                    "h-auto min-h-[140px] py-3 resize-none",
                                    state.errors?.message && "border-[#D85656] focus:border-[#D85656] focus:ring-[#D85656]"
                                )}
                                placeholder="How can we help you?"
                            />
                            {state.errors?.message && (
                                <p className={errorClasses}>
                                    <WarningCircle weight="fill" /> {state.errors.message[0]}
                                </p>
                            )}
                        </div>

                        {/* Actions Row */}
                        <div className="pt-2 flex items-center justify-between">
                            <a
                                href="mailto:support@tech-cal.com"
                                className="text-[13px] font-medium text-[#8A8F98] hover:text-white transition-colors flex items-center gap-1.5"
                            >
                                Email us directly
                                <ArrowUpRight className="w-3.5 h-3.5" />
                            </a>

                            <div className="flex items-center gap-4">
                                <AnimatePresence>
                                    {state.success && (
                                        <motion.div
                                            initial={{ opacity: 0, x: 10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0 }}
                                            className="flex items-center gap-1.5 text-[#46A758] text-[13px] font-medium"
                                        >
                                            <CheckCircle weight="fill" className="w-4 h-4" />
                                            <span>Sent!</span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                <SubmitButton disabled={!selectedSubject} />
                            </div>
                        </div>

                        {state.errors?._form && (
                            <div className="p-3 rounded-lg bg-[#2D1B1B] border border-[#D85656]/20 text-[#D85656] text-[13px]">
                                {state.errors._form[0]}
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}
