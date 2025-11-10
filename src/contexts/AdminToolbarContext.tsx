'use client';

import React, { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

export type AdminToolbarSearchConfig = {
    placeholder?: string;
    value?: string;
    onChange?: (value: string) => void;
    onSubmit?: (value: string) => void;
};

export type AdminQuickFilter = {
    id: string;
    label: string;
    active: boolean;
    badge?: number;
    tooltip?: string;
    onToggle: () => void;
};

export type AdminBulkAction = {
    id: string;
    label: string;
    icon?: ReactNode;
    shortcut?: string;
    disabled?: boolean;
    tooltip?: string;
    onSelect: () => void;
};

export interface AdminToolbarState {
    title?: string;
    subtitle?: string;
    search?: AdminToolbarSearchConfig;
    quickFilters: AdminQuickFilter[];
    toolbarContent?: ReactNode;
    selectedRowCount: number;
    bulkActions: AdminBulkAction[];
}

export interface AdminToolbarContextValue extends AdminToolbarState {
    setTitle: (title?: string) => void;
    setSubtitle: (subtitle?: string) => void;
    setSearch: (search?: AdminToolbarSearchConfig) => void;
    setQuickFilters: (filters: AdminQuickFilter[]) => void;
    setToolbarContent: (content?: ReactNode) => void;
    setSelectedRowCount: (count: number) => void;
    setBulkActions: (actions: AdminBulkAction[]) => void;
    setSearchFocusHandler: (handler?: () => void) => void;
    focusSearch: () => void;
    reset: () => void;
}

const AdminToolbarContext = createContext<AdminToolbarContextValue | null>(null);

const defaultState: AdminToolbarState = {
    title: undefined,
    subtitle: undefined,
    search: undefined,
    quickFilters: [],
    toolbarContent: undefined,
    selectedRowCount: 0,
    bulkActions: [],
};

export function AdminToolbarProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<AdminToolbarState>(defaultState);
    const focusSearchHandlerRef = useRef<(() => void) | undefined>(undefined);

    const setTitle = useCallback((title?: string) => setState((prev) => ({ ...prev, title })), []);
    const setSubtitle = useCallback((subtitle?: string) => setState((prev) => ({ ...prev, subtitle })), []);
    const setSearch = useCallback(
        (search?: AdminToolbarSearchConfig) => setState((prev) => ({ ...prev, search })),
        []
    );
    const setQuickFilters = useCallback(
        (quickFilters: AdminQuickFilter[]) => setState((prev) => ({ ...prev, quickFilters })),
        []
    );
    const setToolbarContent = useCallback(
        (toolbarContent?: ReactNode) => setState((prev) => ({ ...prev, toolbarContent })),
        []
    );
    const setSelectedRowCount = useCallback(
        (selectedRowCount: number) => setState((prev) => ({ ...prev, selectedRowCount })),
        []
    );
    const setBulkActions = useCallback(
        (bulkActions: AdminBulkAction[]) => setState((prev) => ({ ...prev, bulkActions })),
        []
    );
    const setSearchFocusHandler = useCallback((focusSearchHandler?: () => void) => {
        focusSearchHandlerRef.current = focusSearchHandler;
    }, []);
    const focusSearch = useCallback(() => {
        focusSearchHandlerRef.current?.();
    }, []);
    const reset = useCallback(() => {
        setState(() => ({ ...defaultState }));
        focusSearchHandlerRef.current = undefined;
    }, []);

    const value = useMemo<AdminToolbarContextValue>(
        () => ({
            ...state,
            setTitle,
            setSubtitle,
            setSearch,
            setQuickFilters,
            setToolbarContent,
            setSelectedRowCount,
            setBulkActions,
            setSearchFocusHandler,
            focusSearch,
            reset,
        }),
        [
            state,
            setTitle,
            setSubtitle,
            setSearch,
            setQuickFilters,
            setToolbarContent,
            setSelectedRowCount,
            setBulkActions,
            setSearchFocusHandler,
            focusSearch,
            reset,
        ]
    );

    const handleResetOnUnmount = useCallback(() => () => reset(), [reset]);

    return (
        <AdminToolbarContext.Provider value={value}>
            <ToolbarResetter onReset={handleResetOnUnmount}>
                {children}
            </ToolbarResetter>
        </AdminToolbarContext.Provider>
    );
}

function ToolbarResetter({ onReset, children }: { onReset: () => () => void; children: ReactNode }) {
    React.useEffect(onReset, [onReset]);
    return <>{children}</>;
}

export function useAdminToolbar() {
    const ctx = useContext(AdminToolbarContext);
    if (!ctx) {
        throw new Error('useAdminToolbar must be used within AdminToolbarProvider');
    }
    return ctx;
}


