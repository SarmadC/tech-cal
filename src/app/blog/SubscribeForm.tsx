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
            className="absolute right-1 top-1 bottom-1 bg-white hover:bg-zinc-200 text-black font-medium px-6 rounded-full transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center text-sm"
        >
            {pending && <CircleNotchIcon className="mr-2 h-4 w-4 animate-spin" />}
            {pending ? '...' : 'Start Free Trial'}
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
        <div className="w-full grid md:grid-cols-2 gap-12 items-end">
            {/* Left: Newsletter */}
            <div className="w-full max-w-lg">
                <h2 className="text-xl md:text-2xl font-semibold text-white mb-6">
                    Subscribe to our newsletter for daily industry insights
                </h2>

                <form ref={formRef} action={formAction} className="relative">
                    <div className="relative">
                        <input
                            type="email"
                            name="email"
                            placeholder="Enter Your Email"
                            required
                            className="w-full pl-6 pr-40 py-4 rounded-full bg-white/[0.03] border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all"
                        />
                        <SubmitButton />
                    </div>
                </form>
            </div>

            {/* Right: Socials */}
            <div className="md:pl-12 border-l border-white/5 md:border-l-0 md:border-white/10 hidden md:block">
                <h3 className="text-lg font-medium text-white mb-2">Follow us</h3>
                <p className="text-sm text-zinc-500 mb-4 max-w-xs">
                    Get the latest news and travel inspiration.
                </p>
                <div className="flex items-center space-x-4">
                    <Link href="https://twitter.com/kurecal" className="text-zinc-400 hover:text-white transition-colors">
                        <TwitterLogo size={20} weight="fill" />
                    </Link>
                    <Link href="https://linkedin.com/company/kurecal" className="text-zinc-400 hover:text-white transition-colors">
                        <LinkedinLogo size={20} weight="fill" />
                    </Link>
                </div>
            </div>
            {/* Mobile Socials (visible only on mobile) */}
            <div className="md:hidden mt-8">
                <h3 className="text-lg font-medium text-white mb-2">Follow us</h3>
                <div className="flex items-center space-x-4">
                    <Link href="https://twitter.com/kurecal" className="text-zinc-400 hover:text-white transition-colors">
                        <TwitterLogo size={20} weight="fill" />
                    </Link>
                    <Link href="https://linkedin.com/company/kurecal" className="text-zinc-400 hover:text-white transition-colors">
                        <LinkedinLogo size={20} weight="fill" />
                    </Link>
                </div>
            </div>
        </div>
    );
}