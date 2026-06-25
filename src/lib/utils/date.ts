/**
 * Formats a given Date object (or today's date) into a timezone-safe 'YYYY-MM-DD' string
 * using local calendar components to prevent UTC shift.
 */
export const getLocalDateString = (date = new Date()): string => {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Returns yesterday's local date string formatted as 'YYYY-MM-DD'.
 */
export const getYesterdayLocalDateString = (): string => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return getLocalDateString(yesterday);
};
