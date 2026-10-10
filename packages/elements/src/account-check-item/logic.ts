/** One line of the account check: done, or something to do; apart from the look. */

export type CheckTone = 'ok' | 'warn' | 'info';

export interface AccountCheckItemLogic {
  title: () => string;
  note: () => string;
  tone: () => CheckTone;
  action: () => string;
  href: () => string;
}
