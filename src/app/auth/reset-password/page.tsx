// src/app/auth/reset-password/page.tsx

import { Suspense } from 'react';
import ResetPasswordClientView from './ResetPasswordClientView';

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ResetPasswordClientView />
        </Suspense>
    );
}