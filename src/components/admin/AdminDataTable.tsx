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
    onRowClick?: (row: T) => void;
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
    emptyState = <p className="py-10 text-center text-sm text-foreground-muted">No records found.</p>,
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
    onRowClick,
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
            <span className={cn('ml-1 inline-flex h-5 w-5 items-center justify-center rounded transition', isActive ? 'text-foreground-secondary' : 'text-foreground-muted')}>
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
                <div className="rounded-lg border border-default bg-background-main p-3">
                    {toolbar}
                </div>
            )}

            <div className={cn(
                'relative overflow-hidden rounded-lg shadow-sm',
                containerClassName ?? 'border border-default bg-background-main'
            )}>
                <div className={cn('relative max-h-[70vh] overflow-y-auto', stickyHeader && 'supports-[position:sticky]:[&_thead]:sticky supports-[position:sticky]:[&_thead]:top-0 supports-[position:sticky]:[&_thead]:z-10')}>
                    <Table className={cn('min-w-full', tableClassName)}>
                        <TableHeader className={cn(headerClassName ?? 'bg-background-main text-foreground-muted')}>
                            <TableRow className={cn('border-b border-default', headerRowClassName)}>
                                {selectable && (
                                    <TableHead className="w-10 px-3">
                                        <label className="flex cursor-pointer items-center justify-center">
                                            <input
                                                ref={selectAllRef}
                                                type="checkbox"
                                                className="h-3.5 w-3.5 rounded border-default bg-background-tertiary text-accent-primary focus:ring-2 focus:ring-accent-primary focus:ring-offset-0"
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
                                                'px-4 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-foreground-muted',
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
                                                    'flex w-full items-center justify-start gap-1 text-[10px] uppercase tracking-wider',
                                                    column.align === 'right' && 'justify-end',
                                                    column.align === 'center' && 'justify-center',
                                                    column.sortable ? 'text-foreground-muted hover:text-foreground-tertiary' : 'cursor-default',
                                                    isActiveSort && 'text-foreground-secondary'
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
                                        className="py-10 text-center text-sm text-foreground-muted"
                                    >
                                        Loading data…
                                    </TableCell>
                                </TableRow>
                            ) : rows.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length + (selectable ? 1 : 0)}
                                        className="py-10 text-center text-sm text-foreground-muted"
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
                                                'border-b border-default text-sm text-foreground-tertiary transition-colors hover:bg-accent-primary-light',
                                                isSelected && 'bg-accent-primary-light/50',
                                                onRowClick && 'cursor-pointer',
                                                bodyRowClassName
                                            )}
                                            data-state={isSelected ? 'selected' : undefined}
                                            onClick={(e) => {
                                                // Don't trigger row click if clicking on interactive elements
                                                const target = e.target as HTMLElement;
                                                if (target.closest('button, a, input, label')) {
                                                    return;
                                                }
                                                onRowClick?.(row);
                                            }}
                                        >
                                            {selectable && (
                                                <TableCell className="w-10 px-3 py-2">
                                                    <label className="flex cursor-pointer items-center justify-center">
                                                        <input
                                                            type="checkbox"
                                                            className="h-3.5 w-3.5 rounded border-default bg-background-tertiary text-accent-primary focus:ring-2 focus:ring-accent-primary focus:ring-offset-0"
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
                                                        'px-4 py-2 align-middle',
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
                footerClassName ?? 'border border-default bg-background-main text-foreground-muted'
            )}>
                <div className="flex items-center gap-2">
                    <span className="text-foreground-muted">Rows per page:</span>
                    <Select
                        value={String(pageSize)}
                        onValueChange={(value) => onPageSizeChange?.(Number(value))}
                    >
                        <SelectTrigger className="h-7 w-20 rounded-md border border-default bg-background-tertiary text-xs text-foreground-tertiary">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background-main border-default text-foreground-tertiary">
                            {pageSizeOptions.map((option) => (
                                <SelectItem key={option} value={String(option)} className="text-foreground-tertiary focus:bg-accent-primary-light focus:text-foreground-primary">
                                    {option}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-4 text-[10px] uppercase tracking-wider text-foreground-muted">
                    <span className="leading-none">
                        Showing {hasRows ? `${rangeStart}-${rangeEnd}` : '0'} of {total}
                    </span>
                    <span className="leading-none">
                        Page {clampedPage} of {totalPages}
                    </span>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange?.(Math.max(1, clampedPage - 1))}
                            disabled={clampedPage <= 1}
                            className="h-7 bg-background-tertiary text-foreground-tertiary hover:bg-accent-primary-light border-default"
                        >
                            <MaterialIcon name="chevron_left" size={14} />
                            Prev
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange?.(Math.min(totalPages, clampedPage + 1))}
                            disabled={clampedPage >= totalPages}
                            className="h-7 bg-background-tertiary text-foreground-tertiary hover:bg-accent-primary-light border-default"
                        >
                            Next
                            <MaterialIcon name="chevron_right" size={14} />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminDataTable;


