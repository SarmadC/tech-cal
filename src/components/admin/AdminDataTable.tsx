'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MaterialIcon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { useAdminToolbar, type AdminBulkAction } from '@/contexts/AdminToolbarContext';

type SortDirection = 'asc' | 'desc';

export interface AdminDataTableColumn<T> {
    key: keyof T | string;
    header: string;
    sortable?: boolean;
    align?: 'left' | 'right' | 'center';
    width?: string | number;
    render?: (row: T) => React.ReactNode;
    cellClassName?: string;
    headerClassName?: string;
}

export interface AdminDataTableProps<T> {
    columns: AdminDataTableColumn<T>[];
    rows: T[];
    getRowId: (row: T) => string;
    sortKey?: string;
    sortDirection?: SortDirection;
    onSortChange?: (key: string, direction: SortDirection) => void;
    isLoading?: boolean;
    emptyState?: React.ReactNode;
    selectable?: boolean;
    selectedRowIds?: string[];
    defaultSelectedRowIds?: string[];
    onSelectionChange?: (ids: string[]) => void;
    bulkActions?: AdminBulkAction[];
    page?: number;
    pageSize?: number;
    total?: number;
    pageSizeOptions?: number[];
    onPageChange?: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
    toolbar?: React.ReactNode;
    stickyHeader?: boolean;
    className?: string;
    containerClassName?: string;
    footerClassName?: string;
    tableClassName?: string;
    headerClassName?: string;
    headerRowClassName?: string;
    bodyRowClassName?: string;
}

const DEFAULT_PAGE_SIZES = [10, 20, 50, 100];

export function AdminDataTable<T>({
    columns,
    rows,
    getRowId,
    sortKey,
    sortDirection = 'asc',
    onSortChange,
    isLoading = false,
    emptyState = <p className="py-10 text-center text-sm text-slate-500">No records found.</p>,
    selectable = false,
    selectedRowIds,
    defaultSelectedRowIds = [],
    onSelectionChange,
    bulkActions = [],
    page = 1,
    pageSize = 20,
    total = rows.length,
    pageSizeOptions = DEFAULT_PAGE_SIZES,
    onPageChange,
    onPageSizeChange,
    toolbar,
    stickyHeader = true,
    className,
    containerClassName,
    footerClassName,
    tableClassName,
    headerClassName,
    headerRowClassName,
    bodyRowClassName,
}: AdminDataTableProps<T>) {
    const {
        setSelectedRowCount,
        setBulkActions,
    } = useAdminToolbar();

    const [internalSelection, setInternalSelection] = useState<string[]>(defaultSelectedRowIds);

    const controlledSelection = selectedRowIds !== undefined;
    const currentSelection = controlledSelection ? selectedRowIds : internalSelection;

    useEffect(() => {
        if (!selectable) return;
        setSelectedRowCount(currentSelection.length);
        setBulkActions(currentSelection.length > 0 ? bulkActions : []);
        return () => {
            setSelectedRowCount(0);
            setBulkActions([]);
        };
    }, [bulkActions, currentSelection.length, selectable, setBulkActions, setSelectedRowCount]);

    const toggleRow = (rowId: string) => {
        if (!selectable) return;
        const nextSelection = currentSelection.includes(rowId)
            ? currentSelection.filter((id) => id !== rowId)
            : [...currentSelection, rowId];
        if (!controlledSelection) {
            setInternalSelection(nextSelection);
        }
        onSelectionChange?.(nextSelection);
    };

    const allSelectableIds = useMemo(() => rows.map((row) => getRowId(row)), [getRowId, rows]);

    const selectAllRef = useRef<HTMLInputElement>(null);

    const toggleAll = () => {
        if (!selectable) return;
        const allSelected = currentSelection.length === allSelectableIds.length && allSelectableIds.length > 0;
        const nextSelection = allSelected ? [] : allSelectableIds;
        if (!controlledSelection) {
            setInternalSelection(nextSelection);
        }
        onSelectionChange?.(nextSelection);
    };

    useEffect(() => {
        if (!selectable) return;
        if (!selectAllRef.current) return;
        const isIndeterminate =
            currentSelection.length > 0 && currentSelection.length < allSelectableIds.length;
        selectAllRef.current.indeterminate = isIndeterminate;
    }, [allSelectableIds.length, currentSelection.length, selectable]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const clampedPage = Math.min(Math.max(page, 1), totalPages);
    const hasRows = total > 0 && rows.length > 0;
    const rangeStart = hasRows ? (clampedPage - 1) * pageSize + 1 : 0;
    const rangeEnd = hasRows ? Math.min(rangeStart + rows.length - 1, total) : 0;

    const renderSortIndicator = (columnKey: string | number, sortable?: boolean) => {
        if (!sortable) return null;
        const isActive = sortKey === columnKey;
        return (
            <span className={cn('ml-1 inline-flex h-5 w-5 items-center justify-center rounded transition', isActive ? 'text-white' : 'text-slate-500')}>
                <MaterialIcon
                    name="expand-more"
                    size={14}
                    className={cn(
                        'transition-transform',
                        isActive && sortDirection === 'desc' ? 'rotate-180' : 'rotate-0'
                    )}
                />
            </span>
        );
    };

    const handleChangeSort = (column: AdminDataTableColumn<T>) => {
        if (!column.sortable || !onSortChange) return;
        const columnKey = column.key.toString();
        const direction: SortDirection =
            sortKey === columnKey ? (sortDirection === 'asc' ? 'desc' : 'asc') : 'asc';
        onSortChange(columnKey, direction);
    };

    return (
        <div className={cn('space-y-3', className)}>
            {toolbar && (
                <div className="rounded-lg border border-slate-800/60 bg-slate-900/70 p-3">
                    {toolbar}
                </div>
            )}

            <div className={cn(
                'relative overflow-hidden rounded-lg shadow-sm',
                containerClassName ?? 'border border-slate-800/60 bg-slate-950/60'
            )}>
                <div className={cn('relative max-h-[70vh] overflow-y-auto', stickyHeader && 'supports-[position:sticky]:[&_thead]:sticky supports-[position:sticky]:[&_thead]:top-0 supports-[position:sticky]:[&_thead]:z-10')}>
                    <Table className={cn('min-w-full', tableClassName)}>
                        <TableHeader className={cn(headerClassName ?? 'bg-slate-950/90 text-slate-300')}>
                            <TableRow className={cn('border-b border-slate-800/60', headerRowClassName)}>
                                {selectable && (
                                    <TableHead className="w-10 px-3">
                                        <label className="flex cursor-pointer items-center justify-center">
                                            <input
                                                ref={selectAllRef}
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-primary focus:ring-2 focus:ring-primary"
                                                checked={
                                                    currentSelection.length > 0 &&
                                                    currentSelection.length === allSelectableIds.length
                                                }
                                                onChange={toggleAll}
                                                aria-label="Select all rows"
                                            />
                                        </label>
                                    </TableHead>
                                )}
                                {columns.map((column) => {
                                    const columnKey = column.key.toString();
                                    const isActiveSort = sortKey === columnKey;
                                    const ariaSort = column.sortable
                                        ? (isActiveSort
                                            ? (sortDirection === 'desc' ? 'descending' : 'ascending')
                                            : 'none')
                                        : undefined;
                                    return (
                                        <TableHead
                                            key={columnKey}
                                            className={cn(
                                                'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400',
                                                column.align === 'right' && 'text-right',
                                                column.align === 'center' && 'text-center',
                                                column.headerClassName
                                            )}
                                            style={{ width: column.width }}
                                            aria-sort={ariaSort}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => handleChangeSort(column)}
                                                className={cn(
                                                    'flex w-full items-center justify-start gap-1 text-xs uppercase tracking-wide',
                                                    column.align === 'right' && 'justify-end',
                                                    column.align === 'center' && 'justify-center',
                                                    column.sortable ? 'text-slate-200 hover:text-white' : 'cursor-default',
                                                    isActiveSort && 'text-white'
                                                )}
                                                disabled={!column.sortable}
                                                aria-pressed={column.sortable ? isActiveSort : undefined}
                                            >
                                                {column.header}
                                                {renderSortIndicator(columnKey, column.sortable)}
                                            </button>
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length + (selectable ? 1 : 0)}
                                        className="py-10 text-center text-sm text-slate-400"
                                    >
                                        Loading data…
                                    </TableCell>
                                </TableRow>
                            ) : rows.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length + (selectable ? 1 : 0)}
                                        className="py-10 text-center text-sm text-slate-500"
                                    >
                                        {emptyState}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rows.map((row) => {
                                    const rowId = getRowId(row);
                                    const isSelected = selectable && currentSelection.includes(rowId);
                                    return (
                                        <TableRow
                                            key={rowId}
                                            className={cn(
                                                'border-b border-slate-800/40 text-sm text-slate-200 transition-colors hover:bg-slate-900/60',
                                                isSelected && 'bg-slate-900/80',
                                                bodyRowClassName
                                            )}
                                            data-state={isSelected ? 'selected' : undefined}
                                        >
                                            {selectable && (
                                                <TableCell className="w-10 px-3">
                                                    <label className="flex cursor-pointer items-center justify-center">
                                                        <input
                                                            type="checkbox"
                                                            className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-primary focus:ring-2 focus:ring-primary"
                                                            checked={isSelected}
                                                            onChange={() => toggleRow(rowId)}
                                                            aria-label={`Select ${rowId}`}
                                                        />
                                                    </label>
                                                </TableCell>
                                            )}
                                            {columns.map((column) => (
                                                <TableCell
                                                    key={column.key.toString()}
                                                    className={cn(
                                                        'px-4 py-3 align-middle',
                                                        column.align === 'right' && 'text-right',
                                                        column.align === 'center' && 'text-center',
                                                        column.cellClassName
                                                    )}
                                                >
                                                    {(() => {
                                                        if (column.render) {
                                                            return column.render(row);
                                                        }
                                                        const record = row as Record<string, unknown>;
                                                        const key = column.key.toString();
                                                        const raw = record[key];
                                                        return (raw as React.ReactNode) ?? null;
                                                    })()}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <div className={cn(
                'flex flex-col gap-3 rounded-lg px-4 py-3 text-sm shadow-sm md:flex-row md:items-center md:justify-between',
                footerClassName ?? 'border border-slate-800/60 bg-slate-950/60 text-slate-300'
            )}>
                <div className="flex items-center gap-2">
                    <span>Rows per page:</span>
                    <Select
                        value={String(pageSize)}
                        onValueChange={(value) => onPageSizeChange?.(Number(value))}
                    >
                        <SelectTrigger className="h-8 w-20 rounded-md border border-slate-700 bg-slate-900/80 text-xs text-slate-200">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 text-slate-100">
                            {pageSizeOptions.map((option) => (
                                <SelectItem key={option} value={String(option)} className="text-slate-200">
                                    {option}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-4 text-xs uppercase tracking-wide text-slate-400">
                    <span className="text-[0.65rem] leading-none tracking-widest">
                        Showing {hasRows ? `${rangeStart}-${rangeEnd}` : '0'} of {total}
                    </span>
                    <span className="text-[0.65rem] leading-none tracking-widest">
                        Page {clampedPage} of {totalPages}
                    </span>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange?.(Math.max(1, clampedPage - 1))}
                            disabled={clampedPage <= 1}
                            className="bg-slate-900/80 text-slate-200 hover:bg-slate-800"
                        >
                            <MaterialIcon name="chevron_left" size={16} />
                            Prev
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange?.(Math.min(totalPages, clampedPage + 1))}
                            disabled={clampedPage >= totalPages}
                            className="bg-slate-900/80 text-slate-200 hover:bg-slate-800"
                        >
                            Next
                            <MaterialIcon name="chevron_right" size={16} />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminDataTable;


