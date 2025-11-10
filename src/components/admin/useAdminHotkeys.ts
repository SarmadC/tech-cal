'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

type NullableHandler = (() => void) | undefined;

export interface AdminHotkeyHandlers {
    focusSearch?: NullableHandler;
    openHelp?: NullableHandler;
    onApproveSelected?: NullableHandler;
    onRejectSelected?: NullableHandler;
    onMarkPending?: NullableHandler;
    onNavigateNext?: NullableHandler;
    onNavigatePrevious?: NullableHandler;
}

const NAV_KEYS: Record<string, string> = {
    u: '/admin/ingestion/update-queue',
    m: '/admin/ingestion/moderation',
    e: '/admin/ingestion/enrichment',
    f: '/admin/ingestion/field-protection',
};

export function useAdminHotkeys(handlers: AdminHotkeyHandlers = {}) {
    const router = useRouter();
    const prefixTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const expectNavigationRef = useRef(false);

    const handlersRef = useRef(handlers);
    handlersRef.current = handlers;

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.defaultPrevented) return;
            const { key, metaKey, ctrlKey, altKey } = event;

            const metaPressed = metaKey || ctrlKey || altKey;

            if (key === '?' && event.shiftKey) {
                handlersRef.current.openHelp?.();
                event.preventDefault();
                return;
            }

            if (metaPressed) {
                return;
            }

            if (key === '/') {
                handlersRef.current.focusSearch?.();
                event.preventDefault();
                return;
            }

            if (expectNavigationRef.current) {
                expectNavigationRef.current = false;
                if (prefixTimeoutRef.current) {
                    clearTimeout(prefixTimeoutRef.current);
                    prefixTimeoutRef.current = null;
                }

                const destination = NAV_KEYS[key];
                if (destination) {
                    router.push(destination);
                    event.preventDefault();
                    return;
                }
            }

            if (key === 'g') {
                expectNavigationRef.current = true;
                if (prefixTimeoutRef.current) {
                    clearTimeout(prefixTimeoutRef.current);
                }
                prefixTimeoutRef.current = setTimeout(() => {
                    expectNavigationRef.current = false;
                    prefixTimeoutRef.current = null;
                }, 800);
                return;
            }

            switch (key) {
                case 'a':
                    handlersRef.current.onApproveSelected?.();
                    event.preventDefault();
                    break;
                case 'r':
                    handlersRef.current.onRejectSelected?.();
                    event.preventDefault();
                    break;
                case 'p':
                    handlersRef.current.onMarkPending?.();
                    event.preventDefault();
                    break;
                case 'j':
                    handlersRef.current.onNavigateNext?.();
                    event.preventDefault();
                    break;
                case 'k':
                    handlersRef.current.onNavigatePrevious?.();
                    event.preventDefault();
                    break;
                default:
                    break;
            }
        };

        const handleKeyUp = () => {
            if (prefixTimeoutRef.current) {
                clearTimeout(prefixTimeoutRef.current);
                prefixTimeoutRef.current = null;
            }
            expectNavigationRef.current = false;
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
            if (prefixTimeoutRef.current) {
                clearTimeout(prefixTimeoutRef.current);
                prefixTimeoutRef.current = null;
            }
        };
    }, [router]);
}

export default useAdminHotkeys;


