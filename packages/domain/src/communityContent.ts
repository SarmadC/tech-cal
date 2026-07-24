import type { MobileCommunityPostMention } from "./community";

export type CommunityContentSegment =
  | { type: "text"; text: string }
  | { type: "url"; text: string; url: string }
  | { type: "mention"; text: string; userId: string; username: string };

const CONTENT_TOKEN_PATTERN =
  /(https?:\/\/[^\s<>()]+|@[a-zA-Z0-9_][a-zA-Z0-9_.-]*)/g;
const TRAILING_URL_PUNCTUATION = /[.,!?;:]+$/;
const OBJECTIONABLE_CONTENT_PATTERNS = [
  /\bkill\s+(?:yourself|urself|u)\b/i,
  /\b(?:i(?:'| a)?m going to|i will|we will)\s+(?:kill|hurt|shoot)\s+(?:you|them|him|her)\b/i,
  /\b(?:child|minor|underage)\s+(?:porn|sexual|nudes?)\b/i,
  /\b(?:rape|lynch)\s+(?:you|them|him|her)\b/i,
] as const;

function normalizeModerationText(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[@4]/g, "a")
    .replace(/[3]/g, "e")
    .replace(/[1!|]/g, "i")
    .replace(/[0]/g, "o")
    .replace(/[5$]/g, "s")
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function containsObjectionableCommunityContent(value: string): boolean {
  const normalized = normalizeModerationText(value);
  return OBJECTIONABLE_CONTENT_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function tokenizeCommunityContent(
  content: string,
  mentions: MobileCommunityPostMention[] = [],
): CommunityContentSegment[] {
  const mentionByUsername = new Map(
    mentions
      .filter((mention) => mention.username)
      .map((mention) => [mention.username!.toLowerCase(), mention]),
  );
  const segments: CommunityContentSegment[] = [];
  let cursor = 0;

  for (const match of content.matchAll(CONTENT_TOKEN_PATTERN)) {
    const rawText = match[0];
    const index = match.index ?? 0;

    if (index > cursor) {
      segments.push({ type: "text", text: content.slice(cursor, index) });
    }

    if (rawText.startsWith("@")) {
      const username = rawText.slice(1);
      const mention = mentionByUsername.get(username.toLowerCase());
      if (mention?.username) {
        segments.push({
          type: "mention",
          text: rawText,
          userId: mention.userId,
          username: mention.username,
        });
      } else {
        segments.push({ type: "text", text: rawText });
      }
      cursor = index + rawText.length;
      continue;
    }

    const trailing = rawText.match(TRAILING_URL_PUNCTUATION)?.[0] ?? "";
    const urlText = trailing ? rawText.slice(0, -trailing.length) : rawText;
    segments.push({ type: "url", text: urlText, url: urlText });
    if (trailing) {
      segments.push({ type: "text", text: trailing });
    }
    cursor = index + rawText.length;
  }

  if (cursor < content.length) {
    segments.push({ type: "text", text: content.slice(cursor) });
  }

  return segments.length ? segments : [{ type: "text", text: content }];
}
