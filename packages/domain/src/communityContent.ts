import type { MobileCommunityPostMention } from "./community";

export type CommunityContentSegment =
  | { type: "text"; text: string }
  | { type: "url"; text: string; url: string }
  | { type: "mention"; text: string; userId: string; username: string };

const CONTENT_TOKEN_PATTERN =
  /(https?:\/\/[^\s<>()]+|@[a-zA-Z0-9_][a-zA-Z0-9_.-]*)/g;
const TRAILING_URL_PUNCTUATION = /[.,!?;:]+$/;

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
