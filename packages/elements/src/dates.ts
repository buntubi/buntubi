/**
 * Dates as the console shows them: the day only, in UTC, so a server render and the browser
 * write the same text.
 */
export function shortDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(iso));
}
