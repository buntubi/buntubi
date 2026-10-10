/** Creating an account from the console: invited by email, or ready with a first password. */
import type { ReactiveControl, ReactiveForm } from '@fluixi-ui/form';
import type { NewUserInput } from '@idp/sdk/schemas/users';

export type CreateMode = 'invite' | 'password';

export interface UserCreateLabels {
  title: string;
  email: string;
  givenName: string;
  familyName: string;
  language: string;
  languages: { fr: string; en: string };
  mode: string;
  modes: { invite: string; password: string };
  inviteHelp: string;
  passwordHelp: string;
  password: string;
  create: string;
  pending: string;
  error: string;
}

export const userCreateLabels: UserCreateLabels = {
  title: 'New user',
  email: 'Email',
  givenName: 'First name',
  familyName: 'Last name',
  language: 'Language of emails and pages',
  languages: { fr: 'Français', en: 'English' },
  mode: 'How they get in',
  modes: { invite: 'Invitation by email', password: 'Ready now' },
  inviteHelp: 'They get an email with a link to choose a password. The link also verifies their address; it stays valid seven days.',
  passwordHelp: 'You choose the first password and give it to them. Their address counts as verified: no email, no code at sign-in.',
  password: 'First password (10 characters or more)',
  create: 'Create the user',
  pending: 'Creating',
  error: 'Something went wrong. Try again.',
};

/** The form's values: the engine widens a field to `string`, so the language is narrowed at submit. */
export type UserCreateValues = Omit<NewUserInput, 'locale'> & { locale: string };

/** The form engine's root, typed per field. */
export interface UserCreateForm extends ReactiveForm<UserCreateValues> {
  get<K extends keyof UserCreateValues>(key: K): ReactiveControl<UserCreateValues[K]>;
}

export interface UserCreateLogic {
  labels: () => UserCreateLabels;
  form: UserCreateForm;
  submit: (values: UserCreateValues) => Promise<void>;
  mode: () => CreateMode;
  setMode: (mode: CreateMode) => void;
  busy: () => boolean;
  error: () => string | null;
}

export interface UserCreateEvents {
  /** The account exists; its id. */
  created: { id: string };
}
