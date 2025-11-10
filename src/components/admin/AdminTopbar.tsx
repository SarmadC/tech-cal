'use client';

import React, { useEffect, useMemo, useRef } from 'react';

import AdminBreadcrumbs from '@/components/admin/AdminBreadcrumbs';
import { Button } from '@/components/ui/button';
import { MaterialIcon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { useAdminToolbar } from '@/contexts/AdminToolbarContext';

export default function AdminTopbar() {
    const {
        title,
        subtitle,
        search,
        quickFilters,
        toolbarContent,
        selectedRowCount,
        bulkActions,
        setSearchFocusHandler,
    } = useAdminToolbar();
    const searchInputRef = useRef<HTMLInputElement>(null);

    const showSearch = Boolean(search?.onChange || search?.onSubmit);

    useEffect(() => {
        setSearchFocusHandler(() => {
            searchInputRef.current?.focus();
            searchInputRef.current?.select();
        });
        return () => setSearchFocusHandler(undefined);
    }, [setSearchFocusHandler]);

    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            const isTyping =
                target &&
                (target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.isContentEditable ||
                    target.tagName === 'SELECT');
            if (!isTyping && event.key === '/') {
                event.preventDefault();
                searchInputRef.current?.focus();
            }
        };

        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (search?.onSubmit) {
            const value = searchInputRef.current?.value ?? '';
            search.onSubmit(value);
        }
    };

    const bulkActionButtons = useMemo(() => {
        if (!selectedRowCount || selectedRowCount <= 0 || bulkActions.length === 0) {
            return null;
        }
        return (
            <div
                className="flex flex-col gap-2 rounded-lg border border-slate-700/40 bg-slate-900/60 px-4 py-3 text-slate-200 shadow-sm backdrop-blur"
                role="status"
                aria-live="polite"
            >
                <div className="flex items-center gap-2 text-sm">
                    <MaterialIcon name="check-circle" size={16} className="text-emerald-400" />
                    <span>
                        {selectedRowCount} {selectedRowCount === 1 ? 'row selected' : 'rows selected'}
                    </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {bulkActions.map((action) => (
                        <Button
                            key={action.id}
                            size="sm"
                            variant="secondary"
                            onClick={action.onSelect}
                            disabled={action.disabled}
                            className="gap-2"
                            title={action.tooltip}
                        >
                            {action.icon}
                            <span>{action.label}</span>
                            {action.shortcut && (
                                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] uppercase text-slate-300">
                                    {action.shortcut}
                                </span>
                            )}
                        </Button>
                    ))}
                </div>
            </div>
        );
    }, [bulkActions, selectedRowCount]);

    return (
        <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/90 shadow-md backdrop-blur">
            <div className="mx-auto w-full max-w-6xl px-4 py-4 lg:px-8">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-col gap-1">
                            <AdminBreadcrumbs />
                            {title && (
                                <h1 className="text-xl font-semibold text-white lg:text-2xl">
                                    {title}
                                </h1>
                            )}
                            {subtitle && (
                                <p className="text-sm text-slate-400 lg:text-base">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                        {showSearch && (
                            <form onSubmit={handleSubmit} className="w-full lg:max-w-md">
                                <div className="relative flex items-center">
                                    <span className="pointer-events-none absolute left-3 text-slate-500">
                                        <MaterialIcon name="search" size={16} />
                                    </span>
                                    <input
                                        ref={searchInputRef}
                                        type="search"
                                        name="admin-search"
                                        className="h-10 w-full rounded-md border border-slate-700/60 bg-slate-900/80 pl-9 pr-12 text-sm text-slate-100 placeholder:text-slate-500 shadow-inner focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/40"
                                        placeholder={search?.placeholder ?? 'Search admin data...'}
                                        value={search?.value ?? ''}
                                        onChange={(event) => search?.onChange?.(event.target.value)}
                                        aria-label="Search admin data"
                                    />
                                    <div className="pointer-events-none absolute right-2 flex items-center gap-1 text-[10px] uppercase text-slate-500">
                                        <span className="rounded border border-slate-700 px-1.5 py-0.5">/</span>
                                    </div>
                                </div>
                            </form>
                        )}
                    </div>

                    {quickFilters.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                            {quickFilters.map((filter) => (
                                <button
                                    key={filter.id}
                                    type="button"
                                    onClick={filter.onToggle}
                                    className={cn(
                                        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition',
                                        filter.active
                                            ? 'border-emerald-400/80 bg-emerald-500/20 text-emerald-200 shadow-sm'
                                            : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-500 hover:text-white'
                                    )}
                                    aria-pressed={filter.active}
                                    title={filter.tooltip}
                                >
                                    {filter.badge !== undefined && (
                                        <span className="rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-200">
                                            {filter.badge}
                                        </span>
                                    )}
                                    {filter.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {toolbarContent}

                    {bulkActionButtons}
                </div>
            </div>
        </header>
    );
}


