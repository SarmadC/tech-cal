import { useEffect, useRef, useCallback } from 'react';

/**
 * Pushes a browser history entry on mount so that the mobile back gesture
 * (or browser back button) closes the overlay instead of navigating away.
 *
 * Usage: call inside a component that is only rendered when the overlay is open.
 *
 * @param panelId  Unique identifier for this overlay (used in history.state)
 * @param onClose  Callback that sets React state to close the overlay
 * @returns { close } — call this from close buttons / Escape handlers
 */
export function useBackClose(panelId: string, onClose: () => void) {
    const isPushedRef = useRef(false);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    // Push history entry on mount
    useEffect(() => {
        if (typeof window === 'undefined') return;

        window.history.pushState(
            { ...window.history.state, __backClose: panelId },
            ''
        );
        isPushedRef.current = true;

        const handlePopState = () => {
            if (!isPushedRef.current) return;
            isPushedRef.current = false;
            onCloseRef.current();
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
            // If still pushed when unmounting (e.g., parent navigated away),
            // pop the orphaned entry to keep history clean.
            if (isPushedRef.current) {
                isPushedRef.current = false;
                window.history.back();
            }
        };
    }, [panelId]);

    const close = useCallback(() => {
        if (!isPushedRef.current) {
            // Entry already popped — just call onClose directly
            onCloseRef.current();
            return;
        }
        // history.back() will fire popstate → handlePopState → onClose
        window.history.back();
    }, []);

    return { close };
}
