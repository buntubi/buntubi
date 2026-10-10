/** Recent security activity: one row per event, what, from where, when; apart from the look. */
import type { ActivityEntry, ActivityKind } from '@idp/sdk/account';

export interface SecurityActivityLabels {
  title: string;
  /** {n} is the number of days shown. */
  period: string;
  what: string;
  where: string;
  when: string;
  kinds: Record<ActivityKind, string>;
  signInTwoStep: string;
  /** {n} is the number of tries in a row. */
  wrongPasswords: string;
  /** {browser} on {system}. */
  device: string;
  unknownDevice: string;
  empty: string;
  /** Under the table: what to do about an event one does not recognise. */
  advice: string;
}

export const securityActivityLabels: SecurityActivityLabels = {
  title: 'Recent security activity',
  period: 'Last {n} days',
  what: 'What happened',
  where: 'Where',
  when: 'When',
  kinds: {
    sign_in: 'Signed in',
    sign_in_failed: 'Wrong password',
    password_changed: 'Password changed',
    password_reset: 'Password reset by email',
    password_reset_sent: 'Password reset link sent by an administrator',
    mfa_enabled: 'Two-step sign-in turned on',
    mfa_disabled: 'Two-step sign-in turned off',
    backup_code_used: 'Backup code used',
    backup_codes_renewed: 'New backup codes made',
    email_change_requested: 'Email change asked',
    email_changed: 'Email address changed',
    signed_out_everywhere: 'Signed out everywhere by an administrator',
    signed_out_others: 'Other devices signed out',
  },
  signInTwoStep: 'Signed in with two-step',
  wrongPasswords: 'Wrong password, {n} tries',
  device: '{browser} on {system}',
  unknownDevice: 'Unknown browser',
  empty: 'Nothing in this period.',
  advice: 'Something you don’t recognise? Change your password and sign out of your other devices.',
};

export type ActivityTone = 'ok' | 'warn' | 'info';

export interface ActivityRow {
  key: string;
  what: string;
  where: string;
  when: string;
  tone: ActivityTone;
}

export interface SecurityActivityLogic {
  labels: () => SecurityActivityLabels;
  period: () => string;
  rows: () => ActivityRow[];
}
