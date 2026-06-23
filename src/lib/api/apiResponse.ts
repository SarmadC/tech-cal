import { NextResponse } from 'next/server';
import type { ZodIssue } from 'zod';
import { getErrorMessage } from '@/utils/errorHandling';

export function successJson<T>(data: T, init?: { status?: number; headers?: Record<string, string> }) {
  return NextResponse.json(
    { success: true as const, data },
    init,
  );
}

export function errorJson(
  error: string,
  status: number,
  extra?: Record<string, unknown>,
) {
  return NextResponse.json(
    { success: false as const, error, ...extra },
    { status },
  );
}

export function unauthorizedJson() {
  return errorJson('Authentication required', 401);
}

export function rateLimitedJson() {
  return errorJson('Too many requests. Please try again later.', 429);
}

export function validationErrorJson(message: string, issues?: ZodIssue[]) {
  return errorJson(message, 400, issues ? { details: issues } : undefined);
}

export function catchErrorJson(error: unknown, fallbackMessage: string, status = 500) {
  return errorJson(getErrorMessage(error, fallbackMessage), status);
}
