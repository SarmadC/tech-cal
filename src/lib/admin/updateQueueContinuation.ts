const UPDATE_QUEUE_PATH = '/admin/ingestion/update-queue';

const parseReturnToUrl = (returnTo: string): URL | null => {
    try {
        return new URL(returnTo, 'http://localhost');
    } catch {
        return null;
    }
};

const getDefaultDirection = (sort: string | null): 'asc' | 'desc' => {
    return sort === 'created_at' ? 'desc' : 'asc';
};

export const isQueueReturnTo = (returnTo: string): boolean => {
    const parsed = parseReturnToUrl(returnTo);
    return parsed?.pathname === UPDATE_QUEUE_PATH;
};

export const readQueueReturnPage = (returnTo: string): number => {
    const parsed = parseReturnToUrl(returnTo);
    const page = Number.parseInt(parsed?.searchParams.get('page') ?? '1', 10);
    return Number.isFinite(page) && page > 0 ? page : 1;
};

export const buildQueueReturnTo = (returnTo: string, page: number): string => {
    const parsed = parseReturnToUrl(returnTo);

    if (!parsed || parsed.pathname !== UPDATE_QUEUE_PATH) {
        return returnTo;
    }

    const next = new URLSearchParams(parsed.searchParams.toString());
    next.set('page', String(Math.max(1, page)));

    const search = next.toString();
    return search ? `${parsed.pathname}?${search}` : parsed.pathname;
};

export const buildQueueContinuationLookupUrl = (returnTo: string, pageOverride?: number): string | null => {
    const parsed = parseReturnToUrl(returnTo);

    if (!parsed || parsed.pathname !== UPDATE_QUEUE_PATH) {
        return null;
    }

    const params = new URLSearchParams(parsed.searchParams.toString());
    const page = pageOverride ?? readQueueReturnPage(returnTo);
    const pageSize = Number.parseInt(params.get('pageSize') ?? '20', 10);
    const safePageSize = Number.isFinite(pageSize) && pageSize > 1 ? pageSize : 2;
    const sort = params.get('sort') ?? 'event_start_time';
    const direction = params.get('direction') ?? getDefaultDirection(sort);

    params.set('status', 'pending');
    params.set('page', String(Math.max(1, page)));
    params.set('pageSize', String(safePageSize));
    params.set('sort', sort);
    params.set('direction', direction);

    return `/api/admin/ingestion/update-queue?${params.toString()}`;
};
