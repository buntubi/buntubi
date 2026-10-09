/** One event in an app's review history; apart from the look. */

export type HistoryTone = 'warn' | 'info' | 'ok' | 'muted';

export interface HistoryEntryLogic {
  title: () => string;
  meta: () => string;
  text: () => string;
  scopes: () => string[];
  date: () => string;
  tone: () => HistoryTone;
}
