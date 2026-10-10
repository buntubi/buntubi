/** The addresses an app may send people back to, as a list to edit; apart from the look. */
import type { ReactiveControl, ReactiveForm } from '@fluixi-ui/form';
import type { RedirectUriInput } from '@idp/sdk/schemas/apps';

/** The form engine's root, typed per field. */
export interface RedirectUriForm extends ReactiveForm<RedirectUriInput> {
  get<K extends keyof RedirectUriInput>(key: K): ReactiveControl<RedirectUriInput[K]>;
}

export interface RedirectUrisLabels {
  title: string;
  intro: string;
  placeholder: string;
  add: string;
  remove: string;
  save: string;
  saved: string;
  empty: string;
  error: string;
}

export const redirectUrisLabels: RedirectUrisLabels = {
  title: 'Redirect URIs',
  intro: 'Where the provider may send people back after sign-in. Exact match, https except localhost.',
  placeholder: 'https://example.com/auth/callback',
  add: 'Add',
  remove: 'Remove',
  save: 'Save',
  saved: 'Saved',
  empty: 'None yet: people cannot sign in until one is added.',
  error: 'Something went wrong. Try again.',
};

export interface RedirectUrisLogic {
  labels: () => RedirectUrisLabels;
  uris: () => string[];
  form: RedirectUriForm;
  add: (values: RedirectUriInput) => void;
  remove: (uri: string) => void;
  changed: () => boolean;
  canManage: () => boolean;
  save: () => Promise<void>;
  busy: () => boolean;
  saved: () => boolean;
  error: () => string | null;
}

