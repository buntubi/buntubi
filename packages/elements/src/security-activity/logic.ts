/** Recent security activity: one row per event, what, from where, when; apart from the look. */
import type { ActivityEntry, ActivityKind } from '@buntubi/sdk/account';
import type { SocialIcon } from '../social-button/logic.js';

export interface SecurityActivityLabels {
  title: string;
  /** {n} is the number of days shown. */
  period: string;
  what: string;
  where: string;
  when: string;
  kinds: Record<ActivityKind, string>;
  signInTwoStep: string;
  signInPasskey: string;
  signInPassword: string;
  /** {provider}: Google, GitHub. */
  signInWith: string;
  /** {provider}, then the second step. */
  signInWithTwoStep: string;
  /** {app}: signed out through that app's own sign-out. */
  signedOutFrom: string;
  /** A sign-in that continued an app's request: {what} is how, {app} the app. */
  toApp: string;
  /** {what} happened to the passkey called {name}. */
  withName: string;
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
    passkey_added: 'Passkey added',
    passkey_removed: 'Passkey removed',
    device_signed_out: 'A device signed out',
    app_access_removed: 'App access removed',
    data_exported: 'Copy of your data downloaded',
    provider_linked: 'Account linked for sign-in',
    provider_unlinked: 'Account unlinked from sign-in',
    signed_out: 'Signed out',
  },
  signInTwoStep: 'Signed in with your password and two-step',
  signInPasskey: 'Signed in with a passkey',
  signInPassword: 'Signed in with your password',
  signInWith: 'Signed in with {provider}',
  signInWithTwoStep: 'Signed in with {provider} and two-step',
  signedOutFrom: 'Signed out from {app}',
  toApp: '{what} to {app}',
  withName: '{what}: {name}',
  wrongPasswords: 'Wrong password, {n} tries',
  device: '{browser} on {system}',
  unknownDevice: 'Unknown browser',
  empty: 'Nothing in this period.',
  advice: 'Something you don’t recognise? Change your password and sign out of your other devices.',
};

export type ActivityTone = 'ok' | 'warn' | 'info';

export interface ActivityRow {
  key: string;
  /** The provider's mark for a row about Google or GitHub; null for the rest, which show `icon`. */
  brand: SocialIcon | null;
  /** A line icon's path data (24 box), for a row without a brand. */
  icon: string;
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
