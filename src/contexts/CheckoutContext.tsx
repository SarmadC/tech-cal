'use client';

import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

type PlanType = 'monthly' | 'annual';

interface CheckoutOptions {
    plan: PlanType;
    userEmail?: string;
    userId?: string;
}

interface CheckoutContextType {
    isOpen: boolean;
    checkoutOptions: CheckoutOptions | null;
    openCheckout: (plan: PlanType) => void;
    closeCheckout: () => void;
    setCheckoutUser: (userId: string, email?: string) => void;
}

const CheckoutContext = createContext<CheckoutContextType | undefined>(undefined);

export function CheckoutProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [checkoutOptions, setCheckoutOptions] = useState<CheckoutOptions | null>(null);

    const setCheckoutUser = useCallback((userId: string, email?: string) => {
        setCheckoutOptions(prev => prev ? { ...prev, userId, userEmail: email } : { plan: 'monthly', userId, userEmail: email });
    }, []);

    const openCheckout = useCallback((plan: PlanType) => {
        setCheckoutOptions(prev => ({ ...prev, plan, userId: prev?.userId, userEmail: prev?.userEmail }));
        setIsOpen(true);
    }, []);

    const closeCheckout = useCallback(() => {
        setIsOpen(false);
    }, []);

    const contextValue = useMemo(() => ({
        isOpen,
        checkoutOptions,
        openCheckout,
        closeCheckout,
        setCheckoutUser
    }), [isOpen, checkoutOptions, openCheckout, closeCheckout, setCheckoutUser]);

    return (
        <CheckoutContext.Provider value={contextValue}>
            {children}
        </CheckoutContext.Provider>
    );
}

export function useCheckout() {
    const context = useContext(CheckoutContext);
    if (context === undefined) {
        throw new Error('useCheckout must be used within a CheckoutProvider');
    }
    return context;
}
