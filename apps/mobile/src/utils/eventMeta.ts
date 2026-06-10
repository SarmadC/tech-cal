import type { MobileEventCard } from "@kurecal/domain";

export function formatEventMeta(
  startTime?: string,
  location?: string | null,
  daysUntil?: number,
): string | null {
  if (!startTime) return null;

  const dateLabel = new Date(startTime).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const parts = [dateLabel];
  if (location?.trim()) parts.push(location.trim());
  if (typeof daysUntil === "number") {
    parts.push(daysUntil === 0 ? "Today" : `${daysUntil} days away`);
  }

  return parts.join(" • ");
}

export function formatEventEyebrow(
  startTime: string,
  location?: string | null,
): string {
  const dateLabel = new Date(startTime).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  const city = location?.trim().split(",")[0]?.trim();
  if (city && city.toLowerCase() !== "remote") {
    return `${dateLabel} · ${city}`;
  }

  return dateLabel;
}

export function isEventSaved(event: MobileEventCard): boolean {
  return (
    event.engagement?.isBookmarked === true ||
    event.badges?.includes("Saved") === true
  );
}
