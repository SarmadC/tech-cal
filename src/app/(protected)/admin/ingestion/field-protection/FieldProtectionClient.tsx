/**
 * Field Protection Configuration Client Component
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AdminDataTable, type AdminDataTableColumn } from '@/components/admin/AdminDataTable';
import { useAdminToolbar } from '@/contexts/AdminToolbarContext';
import useAdminHotkeys from '@/components/admin/useAdminHotkeys';
import { useDebounce } from '@/hooks/useDebounce';
import { MaterialIcon } from '@/components/ui/Icon';
import { useSnackbar } from '@/contexts/SnackbarContext';

type ProtectionMode = 'auto_update' | 'protected' | 'review_required';

interface ProtectionRule {
    id: string;
    field_name: string;
    protection_mode: ProtectionMode;
    default_mode?: ProtectionMode | null;
    updated_at: string;
    updated_by?: string | null;
}

interface FieldProtectionClientProps {
    initialRules: ProtectionRule[];
}

const MODE_LABELS: Record<ProtectionMode, string> = {
    auto_update: 'Auto-update',
    protected: 'Protected',
    review_required: 'Review required',
};

const MODE_BADGE_CLASSES: Record<ProtectionMode, string> = {
    auto_update: 'bg-emerald-500/20 text-emerald-100 border border-emerald-500/40',
    protected: 'bg-amber-500/20 text-amber-100 border border-amber-500/40',
    review_required: 'bg-sky-500/20 text-sky-100 border border-sky-500/40',
};

export default function FieldProtectionClient({ initialRules }: FieldProtectionClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const statusParam = searchParams.get('status') ?? 'all';
    const queryParam = searchParams.get('q') ?? '';

    const [rules, setRules] = useState<ProtectionRule[]>(initialRules);
    const [loading, setLoading] = useState(false);
    const [selectedRows, setSelectedRows] = useState<string[]>([]);
    const [shortcutsOpen, setShortcutsOpen] = useState(false);

    const debouncedSearch = useDebounce(queryParam, 200);

    const { setTitle, setSubtitle, setSearch, setQuickFilters, setToolbarContent, focusSearch } = useAdminToolbar();
    const { showSuccess, showError } = useSnackbar();

    const updateQuery = useCallback(
        (updates: Record<string, string | number | undefined>) => {
            const next = new URLSearchParams(searchParams.toString());
            Object.entries(updates).forEach(([key, value]) => {
                if (value === undefined || value === null || value === '') {
                    next.delete(key);
                } else {
                    next.set(key, String(value));
                }
            });
            const searchString = next.toString();
            router.replace(searchString ? `${pathname}?${searchString}` : pathname, { scroll: false });
        },
        [pathname, router, searchParams]
    );

    useEffect(() => {
        setTitle('Field protection');
        setSubtitle('Lock sensitive event fields so automated updates can’t overwrite curated data.');
    }, [setTitle, setSubtitle]);

    useEffect(() => {
        setSearch({
            placeholder: 'Search fields…',
            value: queryParam,
            onChange: (value) => updateQuery({ q: value || undefined }),
        });
        return () => setSearch(undefined);
    }, [queryParam, setSearch, updateQuery]);

    useEffect(() => {
        const counts = rules.reduce<Record<string, number>>(
            (acc, rule) => {
                acc[rule.protection_mode] = (acc[rule.protection_mode] ?? 0) + 1;
                acc.all += 1;
                return acc;
            },
            { all: rules.length, auto_update: 0, protected: 0, review_required: 0 }
        );

        setQuickFilters([
            { id: 'all', label: 'All', active: statusParam === 'all', badge: counts.all, onToggle: () => updateQuery({ status: undefined }) },
            { id: 'auto_update', label: 'Auto-update', active: statusParam === 'auto_update', badge: counts.auto_update || undefined, onToggle: () => updateQuery({ status: 'auto_update' }) },
            { id: 'review_required', label: 'Needs review', active: statusParam === 'review_required', badge: counts.review_required || undefined, onToggle: () => updateQuery({ status: 'review_required' }) },
            { id: 'protected', label: 'Protected edits', active: statusParam === 'protected', badge: counts.protected || undefined, onToggle: () => updateQuery({ status: 'protected' }) },
        ]);
    }, [rules, setQuickFilters, statusParam, updateQuery]);

    useEffect(() => {
        setToolbarContent(undefined);
        return () => setToolbarContent(undefined);
    }, [setToolbarContent]);

    const filteredRules = useMemo(() => {
        const statusMatches = (rule: ProtectionRule) =>
            statusParam === 'all' ? true : rule.protection_mode === statusParam;
        const needle = debouncedSearch.trim().toLowerCase();
        return rules
            .filter((rule) => statusMatches(rule))
            .filter((rule) =>
                !needle ? true : rule.field_name.toLowerCase().includes(needle)
            )
            .sort((a, b) => a.field_name.localeCompare(b.field_name));
    }, [rules, statusParam, debouncedSearch]);

    const handleUpdate = useCallback(
        async (fields: string[], newMode: ProtectionMode) => {
            if (fields.length === 0) return;
            setLoading(true);
            try {
                const response = await fetch('/api/admin/ingestion/field-protection', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        updates: fields.map((field_name) => ({ field_name, protection_mode: newMode })),
                    }),
                });
                if (!response.ok) {
                    const error = await response.json().catch(() => ({}));
                    throw new Error(error.error || 'Failed to update protection mode');
                }
                const timestamp = new Date().toISOString();
                setRules((prev) =>
                    prev.map((rule) =>
                        fields.includes(rule.field_name)
                            ? { ...rule, protection_mode: newMode, updated_at: timestamp }
                            : rule
                    )
                );
                showSuccess(
                    fields.length === 1
                        ? `Updated protection for “${fields[0]}”`
                        : `Updated ${fields.length} fields`
                );
                setSelectedRows([]);
            } catch (err) {
                console.error('Error updating protection mode:', err);
                showError(err instanceof Error ? err.message : 'Failed to update protection mode');
            } finally {
                setLoading(false);
            }
        },
        [showError, showSuccess]
    );

    const handleSingleUpdate = useCallback(
        (fieldName: string, newMode: ProtectionMode) => {
            handleUpdate([fieldName], newMode);
        },
        [handleUpdate]
    );

    const columns: AdminDataTableColumn<ProtectionRule>[] = useMemo(() => [
        {
            key: 'field_name',
            header: 'Field',
            render: (rule) => (
                <code className="rounded bg-background-secondary/60 px-2 py-1 text-sm text-foreground-primary">
                    {rule.field_name}
                </code>
            ),
        },
        {
            key: 'protection_mode',
            header: 'Mode',
            render: (rule) => (
                <Badge className={MODE_BADGE_CLASSES[rule.protection_mode]}>
                    {MODE_LABELS[rule.protection_mode]}
                </Badge>
            ),
            width: 180,
        },
        {
            key: 'updated_at',
            header: 'Updated',
            render: (rule) => (
                <div className="text-xs text-foreground-tertiary">
                    <div>{formatDistanceToNow(new Date(rule.updated_at), { addSuffix: true })}</div>
                    {rule.updated_by && <div className="text-foreground-muted">by {rule.updated_by}</div>}
                </div>
            ),
            width: 160,
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (rule) => (
                <div className="flex flex-wrap gap-2">
                    <Button
                        size="sm"
                        variant={rule.protection_mode === 'auto_update' ? 'default' : 'outline'}
                        disabled={loading || rule.protection_mode === 'auto_update'}
                        onClick={() => handleSingleUpdate(rule.field_name, 'auto_update')}
                        className="text-xs"
                        aria-pressed={rule.protection_mode === 'auto_update'}
                    >
                        Auto-update
                    </Button>
                    <Button
                        size="sm"
                        variant={rule.protection_mode === 'review_required' ? 'default' : 'outline'}
                        disabled={loading || rule.protection_mode === 'review_required'}
                        onClick={() => handleSingleUpdate(rule.field_name, 'review_required')}
                        className="text-xs"
                        aria-pressed={rule.protection_mode === 'review_required'}
                    >
                        Require review
                    </Button>
                </div>
            ),
            width: 260,
        },
    ], [handleSingleUpdate, loading]);

    const bulkActions = useMemo(
        () => [
            {
                id: 'bulk-auto',
                label: 'Set to auto-update',
                icon: <MaterialIcon name="arrow-forward" size={14} />,
                shortcut: 'a',
                disabled: loading || selectedRows.length === 0,
                onSelect: () => handleUpdate(selectedRows, 'auto_update'),
            },
            {
                id: 'bulk-review',
                label: 'Require review',
                icon: <MaterialIcon name="warning" size={14} />,
                shortcut: 'r',
                disabled: loading || selectedRows.length === 0,
                onSelect: () => handleUpdate(selectedRows, 'review_required'),
            },
        ],
        [handleUpdate, loading, selectedRows]
    );

    useAdminHotkeys({
        focusSearch,
        openHelp: () => setShortcutsOpen(true),
        onApproveSelected: () => handleUpdate(selectedRows, 'auto_update'),
        onRejectSelected: () => handleUpdate(selectedRows, 'review_required'),
    });

    useEffect(() => {
        if (!shortcutsOpen) return;
        const handler = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setShortcutsOpen(false);
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [shortcutsOpen]);

    return (
        <div className="space-y-5">
            <AdminDataTable
                columns={columns}
                rows={filteredRules}
                getRowId={(rule) => rule.field_name}
                selectable
                selectedRowIds={selectedRows}
                onSelectionChange={setSelectedRows}
                bulkActions={bulkActions}
                sortKey="field_name"
                sortDirection="asc"
                isLoading={loading && filteredRules.length === 0}
                toolbar={
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-xs uppercase tracking-wide text-foreground-tertiary">
                            {filteredRules.length} fields • {selectedRows.length} selected
                        </div>
                        <span className="text-xs text-foreground-muted">
                            Use bulk actions to programmatically lock sensitive properties.
                        </span>
                    </div>
                }
            />

            <Card className="border border-default800/60 bg-background-950/60 text-foreground-200">
                <CardHeader className="space-y-2">
                    <CardTitle className="text-base font-semibold">Mode reference</CardTitle>
                    <p className="text-xs text-foreground-tertiary">
                        Configure how ingestion updates interact with manually curated data.
                    </p>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-foreground-tertiary">
                    <div className="flex items-start gap-3">
                        <Badge className={MODE_BADGE_CLASSES.auto_update}>{MODE_LABELS.auto_update}</Badge>
                        <span>Allow trusted ingestion sources to overwrite this field automatically.</span>
                    </div>
                    <div className="flex items-start gap-3">
                        <Badge className={MODE_BADGE_CLASSES.review_required}>{MODE_LABELS.review_required}</Badge>
                        <span>Queue incoming changes for admin review before publishing.</span>
                    </div>
                    <div className="flex items-start gap-3">
                        <Badge className={MODE_BADGE_CLASSES.protected}>{MODE_LABELS.protected}</Badge>
                        <span>Fields with manual edits are auto-protected. Use review mode to approve new updates.</span>
                    </div>
                </CardContent>
            </Card>

            {shortcutsOpen && <FieldProtectionShortcutsOverlay onClose={() => setShortcutsOpen(false)} />}
        </div>
    );
}

function FieldProtectionShortcutsOverlay({ onClose }: { onClose: () => void }) {
    const shortcuts = [
        { keys: '/', label: 'Focus search' },
        { keys: 'a', label: 'Set selected fields to auto-update' },
        { keys: 'r', label: 'Set selected fields to review required' },
        { keys: '?', label: 'Show this help' },
    ];
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background-950/80 backdrop-blur">
            <div className="w-full max-w-md rounded-xl border border-default800 bg-background-950 p-6 shadow-2xl">
                <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-semibold text-foreground-primary">Field protection shortcuts</h2>
                        <p className="text-sm text-foreground-tertiary">
                            Update multiple fields without taking your hands off the keyboard.
                        </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="text-foreground-tertiary hover:bg-background-800">
                        <MaterialIcon name="close" size={16} />
                    </Button>
                </div>
                <div className="space-y-2">
                    {shortcuts.map((shortcut) => (
                        <div key={shortcut.keys} className="flex items-center justify-between gap-3 rounded-md border border-default800/60 bg-background-secondary/60 px-3 py-2">
                            <span className="font-mono text-xs uppercase tracking-wide text-foreground-200">{shortcut.keys}</span>
                            <span className="text-sm text-foreground-tertiary">{shortcut.label}</span>
                        </div>
                    ))}
                </div>
                <p className="mt-4 text-center text-xs text-foreground-muted">Press Esc to close.</p>
            </div>
        </div>
    );
}

