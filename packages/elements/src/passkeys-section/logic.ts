/** The passkeys card: the list, adding one, renaming and removing; apart from the look. */
import type { ReactiveForm } from '@fluixi-ui/form';
import type { Passkey } from '@idp/sdk/account';
import type { PasskeyNameInput, ReauthInput } from '@idp/sdk/schemas/account';
import type { FieldControl } from '../field.js';

export interface PasskeysSectionLabels {
  title: string;
  about: string;
  /** A passkey with no name of its own. */
  unnamed: string;
  add: string;
  adding: string;
  empty: string;
  unsupported: string;
  /** {provider} keeps it and syncs it. */
  synced: string;
  syncedUnknown: string;
  thisDevice: string;
  /** {date} it was added. */
  addedOn: string;
  /** {date} it was last used. */
  lastUsed: string;
  neverUsed: string;
  rename: string;
  name: string;
  save: string;
  cancel: string;
  remove: string;
  /** {name} of the passkey. */
  removeAsk: string;
  removeConfirm: string;
  reauth: string;
  password: string;
  continue: string;
  added: string;
  /** The device prompt closed without a passkey. */
  notAdded: string;
  removed: string;
  error: string;
}

export const passkeysSectionLabels: PasskeysSectionLabels = {
  title: 'Passkeys',
  unnamed: 'Passkey',
  about: 'Sign in with your fingerprint, face or device PIN instead of a password. A passkey also counts as the second step.',
  add: 'Add a passkey',
  adding: 'Waiting for your device',
  empty: 'No passkey yet.',
  unsupported: 'This browser cannot make passkeys.',
  synced: 'Synced with {provider}',
  syncedUnknown: 'Synced to your devices',
  thisDevice: 'On one device',
  addedOn: 'added {date}',
  lastUsed: 'last used {date}',
  neverUsed: 'not used yet',
  rename: 'Rename',
  name: 'Name',
  save: 'Save',
  cancel: 'Cancel',
  remove: 'Remove',
  removeAsk: 'Remove {name}? You will no longer sign in with it.',
  removeConfirm: 'Remove',
  reauth: 'Enter your password to add a passkey: your sign-in is a few minutes old.',
  password: 'Password',
  continue: 'Continue',
  added: 'Passkey added.',
  notAdded: 'No passkey was added. If this device already has one for your account, it is listed here.',
  removed: 'Passkey removed.',
  error: 'Something went wrong. Try again.',
};

export interface PasskeyNameForm extends ReactiveForm<PasskeyNameInput> {
  get<K extends keyof PasskeyNameInput>(key: K): FieldControl<PasskeyNameInput[K]>;
}

export interface ReauthForm extends ReactiveForm<ReauthInput> {
  get<K extends keyof ReauthInput>(key: K): FieldControl<ReauthInput[K]>;
}

export interface PasskeyRow {
  id: string;
  name: string;
  /** Who keeps it, when, and the last use, on one line. */
  detail: string;
}

export interface PasskeysSectionLogic {
  labels: () => PasskeysSectionLabels;
  supported: () => boolean;
  rows: () => PasskeyRow[];
  add: () => Promise<void>;
  askingPassword: () => boolean;
  reauthForm: ReauthForm;
  reauth: (values: ReauthInput) => Promise<void>;
  renaming: () => string | null;
  startRename: (row: PasskeyRow) => void;
  nameForm: PasskeyNameForm;
  rename: (values: PasskeyNameInput) => Promise<void>;
  removing: () => string | null;
  askRemove: (row: PasskeyRow | null) => void;
  remove: (id: string) => Promise<void>;
  cancel: () => void;
  busy: () => boolean;
  notice: () => string | null;
  error: () => string | null;
}
