/** One count, and where it leads; apart from the look. */

export interface StatCardLogic {
  label: () => string;
  value: () => string;
  href: () => string;
  /** The count asks for the reader: something is waiting. */
  attention: () => boolean;
}
