// src/app/auth/reset-password/page.tsx

import { Suspense } from 'react';
import type { Metadata } from 'next';
import ResetPasswordClientView from './ResetPasswordClientView';

export const metadata: Metadata = {
    title: 'Reset Your Password | Kure-Cal',
    robots: {
        index: false,
        follow: true,
    },
};

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ResetPasswordClientView />
        </Suspense>
    );
}
