export function parseOptionalNonNegativeIntegerInput(
  value: string,
  fieldLabel: string
): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`Please enter a valid number of ${fieldLabel}`);
  }

  return Number(trimmed);
}

