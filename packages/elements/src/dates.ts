/**
 * Dates as the console shows them: the day only, in UTC, so a server render and the browser
 * write the same text.
 */
export function shortDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(iso));
}

/** A moment, day and time, in the reader's time zone: for pages rendered in the browser only. */
export function dateTime(iso: string | null | undefined, locale: string): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}
