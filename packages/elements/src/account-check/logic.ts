/** The account's health: what is done and what is left to do; apart from the look. */
import type { CheckTone } from '../account-check-item/logic.js';

export interface AccountCheck {
  key: string;
  title: string;
  note: string;
  tone: CheckTone;
  action?: string;
  href?: string;
}

export interface AccountCheckLabels {
  title: string;
  /** "{done} of {total} done." */
  progress: string;
  allDone: string;
  /** Said when something is left: "One thing to do to keep the account safe." */
  left: string;
}

export const accountCheckLabels: AccountCheckLabels = {
  title: 'Account check',
  progress: '{done} of {total} done.',
  allDone: 'All set.',
  left: 'Something to do to keep the account safe.',
};

export interface AccountCheckLogic {
  labels: () => AccountCheckLabels;
  checks: () => AccountCheck[];
  done: () => number;
  /** 0 to 100, for the bar. */
  percent: () => number;
}
