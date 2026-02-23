export function formatCompactCount(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '0';
  if (value >= 1000000) {
      return (value / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
  }
  if (value >= 1000) {
      return (value / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return value.toString();
}
