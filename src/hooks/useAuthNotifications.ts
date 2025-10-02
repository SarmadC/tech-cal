'use client';

import { useEffect } from 'react';
import { useSnackbar } from '@/contexts/SnackbarContext';

/**
 * Custom hook to handle auth-related notifications using snackbar
 * This hook listens for auth events and shows appropriate snackbar messages
 */
export function useAuthNotifications() {
    const { showSuccess, showInfo, showError } = useSnackbar();

    useEffect(() => {
        const handleAuthEvent = (event: CustomEvent) => {
            const { type, message } = event.detail;
            
            switch (type) {
                case 'SIGNED_IN':
                    showSuccess(message || 'Successfully signed in! Welcome back.');
                    break;
                case 'SIGNED_OUT':
                    showInfo(message || 'You have been signed out.');
                    break;
                case 'AUTH_ERROR':
                    showError(message || 'Authentication error occurred.');
                    break;
                default:
                    break;
            }
        };

        // Listen for custom auth events
        window.addEventListener('auth-notification', handleAuthEvent as EventListener);

        return () => {
            window.removeEventListener('auth-notification', handleAuthEvent as EventListener);
        };
    }, [showSuccess, showInfo, showError]);
}
