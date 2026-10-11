/** The account deletion card: what stops it, the confirmation, the deletion; apart from the look. */
import type { ReactiveForm } from '@fluixi-ui/form';
import type { DeleteAccountInput } from '@idp/sdk/schemas/account';
import type { FieldControl } from '../field.js';

export interface AccountDeletionLabels {
  title: string;
  about: string;
  /** {names} of the organizations it alone owns. */
  owns: string;
  ownsAfter: string;
  portal: string;
  lastAdmin: string;
  confirm: string;
  password: string;
  passwordHint: string;
  delete: string;
  deleting: string;
  error: string;
}

export const accountDeletionLabels: AccountDeletionLabels = {
  title: 'Delete your account',
  about: 'Signs you out everywhere, removes the access of every app, and deletes your profile. Apps keep what they stored about you on their side.',
  owns: 'You own {names}.',
  ownsAfter: 'Give it another owner first, or delete it, in the',
  portal: 'developer portal',
  lastAdmin: 'You are the platform’s last administrator. Give the role to someone else first.',
  confirm: 'Type your email to confirm',
  password: 'Your password',
  passwordHint: 'Your sign-in is a few minutes old.',
  delete: 'Delete my account',
  deleting: 'Deleting',
  error: 'Something went wrong. Try again.',
};

export interface DeletionForm extends ReactiveForm<DeleteAccountInput> {
  get<K extends keyof DeleteAccountInput>(key: K): FieldControl<DeleteAccountInput[K]>;
}

export interface AccountDeletionLogic {
  labels: () => AccountDeletionLabels;
  email: () => string;
  owned: () => string;
  portalHref: () => string;
  lastAdmin: () => boolean;
  blocked: () => boolean;
  passwordNeeded: () => boolean;
  form: DeletionForm;
  matches: () => boolean;
  remove: (values: DeleteAccountInput) => Promise<void>;
  busy: () => boolean;
  error: () => string | null;
}
