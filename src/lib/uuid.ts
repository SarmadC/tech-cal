const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Lightweight UUID v4-ish syntactic check. Used at API route boundaries to
 * reject obviously-malformed identifiers before they reach the database
 * layer (which would otherwise throw a generic cast error and leak
 * implementation details to the client).
 */
export function isValidUuid(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}
