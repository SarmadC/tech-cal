// src/app/blog/SubscribeForm.tsx
'use client';

import { useEffect, useRef, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { subscribeToAction, type SubscribeFormState } from './actions';
import { CircleNotchIcon, TwitterLogo, LinkedinLogo } from '@phosphor-icons/react';
import Link from 'next/link';

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className="bg-[#EDEDEF] hover:bg-white text-black font-medium px-4 py-2 rounded-lg transition-all shadow-[0_1px_2px_rgba(0,0,0,0.1),inset_0_-1px_0_rgba(0,0,0,0.1)] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center text-xs tracking-wide min-w-[90px]"
        >
            {pending && <CircleNotchIcon className="mr-2 h-3.5 w-3.5 animate-spin" />}
            {pending ? '...' : 'Subscribe'}
        </button>
    );
}

export default function SubscribeForm() {
    const formRef = useRef<HTMLFormElement>(null);
    const { showSuccess, showError } = useSnackbar();

    const initialState: SubscribeFormState = {
        message: '',
        status: 'idle',
    };

    const [state, formAction] = useActionState(subscribeToAction, initialState);

    useEffect(() => {
        if (state.status === 'success') {
            showSuccess(state.message);
            formRef.current?.reset();
        } else if (state.status === 'error') {
            showError(state.message);
        }
    }, [state, showSuccess, showError]);

    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div>
                <h3 className="text-xl font-medium text-[#EDEDEF] mb-2 tracking-tight">Stay updated</h3>
                <p className="text-[#8A8F98] max-w-sm leading-relaxed">
                    Get the latest articles and insights delivered to your inbox. No spam, ever.
                </p>
            </div>

            <div className="flex flex-col items-end gap-6 w-full md:w-auto">
                <form action={formAction} ref={formRef} className="flex w-full md:w-auto gap-2">
                    <label htmlFor="subscribe-email" className="sr-only">Email address</label>
                    <input
                        id="subscribe-email"
                        type="email"
                        name="email"
                        placeholder="Enter your email"
                        required
                        className="bg-transparent border border-white/[0.08] text-[#EDEDEF] placeholder-[#575B66] rounded-lg px-3 py-2 w-full md:w-64 focus:outline-none focus:border-white/[0.16] focus:bg-white/[0.02] transition-colors text-sm"
                    />
                    <SubmitButton />
                </form>
                {state.message && (
                    <p className={`text-sm ${state.status === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
                        {state.message}
                    </p>
                )}

                <div className="flex items-center gap-4">
                    <a href="https://twitter.com/kure_cal" target="_blank" rel="noopener noreferrer" className="text-[#8A8F98] hover:text-[#EDEDEF] transition-colors p-2 hover:bg-white/[0.04] rounded-md">
                        <span className="sr-only">Twitter</span>
                        <TwitterLogo size={18} weight="fill" />
                    </a>
                    <a href="https://linkedin.com/company/kure-cal" target="_blank" rel="noopener noreferrer" className="text-[#8A8F98] hover:text-[#EDEDEF] transition-colors p-2 hover:bg-white/[0.04] rounded-md">
                        <span className="sr-only">LinkedIn</span>
                        <LinkedinLogo size={18} weight="fill" />
                    </a>
                </div>
            </div>
        </div>
    );
}