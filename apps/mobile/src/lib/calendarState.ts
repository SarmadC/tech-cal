import type { MobileCalendarFeed } from '@kurecal/domain';

export function resolveCalendarSheetState({
  feed,
  previewFeed,
  previewError,
}: {
  feed: MobileCalendarFeed | null;
  previewFeed: MobileCalendarFeed | null;
  previewError: string | null;
}) {
  const activeSheetFeed = previewFeed ?? feed;

  return {
    activeSheetFeed,
    disableApply: Boolean(previewError),
    previewResultCount: previewError
      ? null
      : activeSheetFeed?.results.totalCount ?? feed?.results.totalCount ?? 0,
  };
}

export function resolveCalendarRenderState({
  error,
  feed,
  loading,
}: {
  error: string | null;
  feed: MobileCalendarFeed | null;
  loading: boolean;
}) {
  return {
    inlineError: feed ? error : null,
    showAgenda: Boolean(feed),
    showFatalError: Boolean(error) && !feed,
    showInitialLoading: loading && !feed,
  };
}
