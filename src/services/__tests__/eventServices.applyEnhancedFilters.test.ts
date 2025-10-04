// src/services/__tests__/eventServices.applyEnhancedFilters.test.ts
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach } from 'vitest';
import type { EventFilters } from '@/types';
import { EventService } from '../eventServices';
import type { MockQueryBuilder } from '@/types/testMocks';

function buildMockQuery() {
  const calls: Array<{ method: string; args: unknown[] }> = [];

  const self = {
    _calls: calls,
    eq: (field: string, value: unknown) => { calls.push({ method: 'eq', args: [field, value] }); return self; },
    neq: (field: string, value: unknown) => { calls.push({ method: 'neq', args: [field, value] }); return self; },
    gt: (field: string, value: unknown) => { calls.push({ method: 'gt', args: [field, value] }); return self; },
    gte: (field: string, value: unknown) => { calls.push({ method: 'gte', args: [field, value] }); return self; },
    lt: (field: string, value: unknown) => { calls.push({ method: 'lt', args: [field, value] }); return self; },
    lte: (field: string, value: unknown) => { calls.push({ method: 'lte', args: [field, value] }); return self; },
    like: (field: string, value: string) => { calls.push({ method: 'like', args: [field, value] }); return self; },
    ilike: (field: string, value: string) => { calls.push({ method: 'ilike', args: [field, value] }); return self; },
    in: (field: string, values: unknown[]) => { calls.push({ method: 'in', args: [field, values] }); return self; },
    is: (field: string, value: string) => { calls.push({ method: 'is', args: [field, value] }); return self; },
    and: (expr: string) => { calls.push({ method: 'and', args: [expr] }); return self; },
    or: (expr: string) => { calls.push({ method: 'or', args: [expr] }); return self; },
    filter: (field: string, op: string, value: unknown) => { calls.push({ method: 'filter', args: [field, op, value] }); return self; },
    order: (field: string, opts?: unknown) => { calls.push({ method: 'order', args: [field, opts] }); return self; },
    limit: (count: number) => { calls.push({ method: 'limit', args: [count] }); return self; },
    range: (from: number, to: number) => { calls.push({ method: 'range', args: [from, to] }); return self; },
    select: (columns?: string) => { calls.push({ method: 'select', args: [columns] }); return self; },
    single: () => Promise.resolve({ data: null, error: null }),
    then: (resolve: (value: unknown) => void) => Promise.resolve(resolve({ data: [], error: null }))
  } as MockQueryBuilder;

  return self;
}

describe('EventService.applyEnhancedFilters - USD gating', () => {
  let mockQuery: MockQueryBuilder;

  beforeEach(() => {
    mockQuery = buildMockQuery();
  });

  it('gates to USD when budget is low', () => {
    const filters: EventFilters = { budget: 'low' } as EventFilters;
    const result = (EventService as unknown as { applyEnhancedFilters: (query: MockQueryBuilder, filters: EventFilters) => MockQueryBuilder }).applyEnhancedFilters(mockQuery, filters);
    expect(result).toBe(mockQuery);

    const currencyCalls = mockQuery._calls.filter((c: { method: string; args: unknown[] }) => c.method === 'eq' && c.args[0] === 'currency');
    expect(currencyCalls.length).toBeGreaterThanOrEqual(1);
    expect(currencyCalls[0].args[1]).toBe('USD');
  });

  it('gates to USD when budget is free-only', () => {
    const filters: EventFilters = { budget: 'free-only' } as EventFilters;
    (EventService as any).applyEnhancedFilters(mockQuery, filters);
    const currencyCalls = mockQuery._calls.filter((c: { method: string; args: unknown[] }) => c.method === 'eq' && c.args[0] === 'currency');
    expect(currencyCalls[0].args[1]).toBe('USD');
  });

  it('does not gate to USD when budget is all', () => {
    const filters: EventFilters = { budget: 'all' } as EventFilters;
    (EventService as any).applyEnhancedFilters(mockQuery, filters);
    const currencyCalls = mockQuery._calls.filter((c: { method: string; args: unknown[] }) => c.method === 'eq' && c.args[0] === 'currency');
    expect(currencyCalls.length).toBe(0);
  });

  it('does not gate to USD when budget is undefined', () => {
    const filters: EventFilters = {} as EventFilters;
    (EventService as any).applyEnhancedFilters(mockQuery, filters);
    const currencyCalls = mockQuery._calls.filter((c: { method: string; args: unknown[] }) => c.method === 'eq' && c.args[0] === 'currency');
    expect(currencyCalls.length).toBe(0);
  });
});

describe('EventService.applyEnhancedFilters - Budget tier price filters', () => {
  let mockQuery: { method: string; args: unknown[] };

  beforeEach(() => {
    mockQuery = buildMockQuery();
  });

  it('applies NULL or zero check for free-only', () => {
    const filters: EventFilters = { budget: 'free-only' } as EventFilters;
    (EventService as any).applyEnhancedFilters(mockQuery, filters);
    const orCalls = mockQuery._calls.filter((c: { method: string; args: unknown[] }) => c.method === 'or');
    expect(orCalls.some((c: { method: string; args: unknown[] }) => c.args[0] === 'price_min.is.null,price_min.eq.0')).toBe(true);
  });

  it('applies price_min <= 100 for low budget', () => {
    const filters: EventFilters = { budget: 'low' } as EventFilters;
    (EventService as any).applyEnhancedFilters(mockQuery, filters);
    const andCalls = mockQuery._calls.filter((c: { method: string; args: unknown[] }) => c.method === 'and');
    const lteCalls = mockQuery._calls.filter((c: { method: string; args: unknown[] }) => c.method === 'lte');
    expect(andCalls.some((c: { method: string; args: unknown[] }) => String(c.args[0]).includes('price_min.is.not.null'))).toBe(true);
    expect(lteCalls.some((c: { method: string; args: unknown[] }) => c.args[0] === 'price_min' && c.args[1] === 100)).toBe(true);
  });

  it('applies price_min <= 500 for moderate budget', () => {
    const filters: EventFilters = { budget: 'moderate' } as EventFilters;
    (EventService as any).applyEnhancedFilters(mockQuery, filters);
    const andCalls = mockQuery._calls.filter((c: { method: string; args: unknown[] }) => c.method === 'and');
    const lteCalls = mockQuery._calls.filter((c: { method: string; args: unknown[] }) => c.method === 'lte');
    expect(andCalls.some((c: { method: string; args: unknown[] }) => String(c.args[0]).includes('price_min.is.not.null'))).toBe(true);
    expect(lteCalls.some((c: { method: string; args: unknown[] }) => c.args[0] === 'price_min' && c.args[1] === 500)).toBe(true);
  });

  it('applies price_min <= 2000 for high budget', () => {
    const filters: EventFilters = { budget: 'high' } as EventFilters;
    (EventService as any).applyEnhancedFilters(mockQuery, filters);
    const andCalls = mockQuery._calls.filter((c: { method: string; args: unknown[] }) => c.method === 'and');
    const lteCalls = mockQuery._calls.filter((c: { method: string; args: unknown[] }) => c.method === 'lte');
    expect(andCalls.some((c: { method: string; args: unknown[] }) => String(c.args[0]).includes('price_min.is.not.null'))).toBe(true);
    expect(lteCalls.some((c: { method: string; args: unknown[] }) => c.args[0] === 'price_min' && c.args[1] === 2000)).toBe(true);
  });

  it('only gates currency for unlimited budget without price filters', () => {
    const filters: EventFilters = { budget: 'unlimited' } as EventFilters;
    (EventService as any).applyEnhancedFilters(mockQuery, filters);
    const currencyCalls = mockQuery._calls.filter((c: { method: string; args: unknown[] }) => c.method === 'eq' && c.args[0] === 'currency');
    const priceLteCalls = mockQuery._calls.filter((c: { method: string; args: unknown[] }) => c.method === 'lte' && c.args[0] === 'price_min');
    const priceOrCalls = mockQuery._calls.filter((c: { method: string; args: unknown[] }) => c.method === 'or' && String(c.args[0]).includes('price_min'));
    expect(currencyCalls.length).toBeGreaterThanOrEqual(1);
    expect(priceLteCalls.length).toBe(0);
    expect(priceOrCalls.length).toBe(0);
  });
});


