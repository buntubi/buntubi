/** One count, what it means, and where it leads; apart from the look. */

export type StatTone = 'muted' | 'ok' | 'warn' | 'bad' | 'info';

export interface StatCardLogic {
  label: () => string;
  value: () => string;
  /** A line under the number: "2 live", "Review changes requested". */
  note: () => string;
  tone: () => StatTone;
  href: () => string;
  /** The count asks for the reader: something is waiting. */
  attention: () => boolean;
}
