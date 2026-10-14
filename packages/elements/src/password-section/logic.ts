/** The password card: when it last changed, and the form to change it; apart from the look. */
import type { ReactiveForm } from '@fluixi-ui/form';
import type { FieldControl } from '../field.js';
import type { PasswordChangeInput } from '@buntu/sdk/schemas/account';

export interface PasswordSectionLabels {
  title: string;
  /** {date} is the last change. */
  changedOn: string;
  neverChanged: string;
  noPassword: string;
  change: string;
  current: string;
  next: string;
  nextHint: string;
  signOutOthers: string;
  save: string;
  cancel: string;
  saved: string;
  error: string;
}

export const passwordSectionLabels: PasswordSectionLabels = {
  title: 'Password',
  changedOn: 'Last changed {date}',
  neverChanged: 'Not changed since the account was made',
  noPassword: 'No password yet: use the link sent to your address.',
  change: 'Change password',
  current: 'Current password',
  next: 'New password',
  nextHint: '10 characters or more.',
  signOutOthers: 'Sign out of my other devices',
  save: 'Change password',
  cancel: 'Cancel',
  saved: 'Password changed.',
  error: 'Something went wrong. Try again.',
};

/** The two text fields; the sign-out choice sits beside the form. */
export type PasswordFields = Omit<PasswordChangeInput, 'sign_out_others'>;

export interface PasswordForm extends ReactiveForm<PasswordFields> {
  get<K extends keyof PasswordFields>(key: K): FieldControl<PasswordFields[K]>;
}

export interface PasswordSectionLogic {
  labels: () => PasswordSectionLabels;
  hasPassword: () => boolean;
  changed: () => string;
  editing: () => boolean;
  setEditing: (on: boolean) => void;
  form: PasswordForm;
  signOutOthers: () => boolean;
  setSignOutOthers: (on: boolean) => void;
  save: (values: PasswordFields) => Promise<void>;
  busy: () => boolean;
  notice: () => string | null;
  error: () => string | null;
}
