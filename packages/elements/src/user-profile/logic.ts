/** One account for the console: its profile, the facts about it, and what an admin may do to it. */
import type { ReactiveForm } from '@fluixi-ui/form';
import type { FieldControl } from '../field.js';
import type { UserEditInput } from '@buntu/sdk/schemas/users';
import type { AdminUser, AdminUserPage, Role } from '@buntu/sdk/types';

export interface UserProfileLabels {
  profile: string;
  givenName: string;
  familyName: string;
  language: string;
  languages: { fr: string; en: string };
  country: string;
  countryHint: string;
  phone: string;
  phoneHint: string;
  address: string;
  street: string;
  postalCode: string;
  locality: string;
  region: string;
  addressCountry: string;
  save: string;
  saved: string;
  account: string;
  email: string;
  verified: string;
  unverified: string;
  signedUp: string;
  lastSignIn: string;
  never: string;
  password: string;
  passwordSet: string;
  passwordInvited: string;
  twoStep: string;
  on: string;
  off: string;
  sessions: string;
  portal: string;
  portalSince: string;
  noPortal: string;
  organizations: string;
  noOrganization: string;
  platform: string;
  roles: Record<Role, string>;
  security: string;
  sendReset: string;
  sendResetHelp: string;
  resetSent: string;
  signOut: string;
  signOutHelp: string;
  signedOut: string;
  resetTwoStep: string;
  resetTwoStepHelp: string;
  twoStepReset: string;
  disable: string;
  enable: string;
  disableHelp: string;
  disabled: string;
  enabled: string;
  adminGiven: string;
  adminRemoved: string;
  makeAdmin: string;
  removeAdmin: string;
  adminHelp: string;
  superadminHelp: string;
  yourselfHelp: string;
  error: string;
}

export const userProfileLabels: UserProfileLabels = {
  profile: 'Profile',
  givenName: 'First name',
  familyName: 'Last name',
  language: 'Language',
  languages: { fr: 'Français', en: 'English' },
  country: 'Country',
  countryHint: 'Where the person lives; the phone starts there.',
  phone: 'Phone',
  phoneHint: 'Pick the country, then type the number.',
  address: 'Postal address',
  street: 'Street and number',
  postalCode: 'Postal code',
  locality: 'City',
  region: 'Region or state',
  addressCountry: 'Country',
  save: 'Save',
  saved: 'Saved.',
  account: 'Account',
  email: 'Email',
  verified: 'Verified',
  unverified: 'Not verified',
  signedUp: 'Signed up',
  lastSignIn: 'Last sign-in',
  never: 'Never',
  password: 'Password',
  passwordSet: 'Chosen',
  passwordInvited: 'Invited, not chosen yet',
  twoStep: 'Two-step sign-in',
  on: 'On',
  off: 'Off',
  sessions: 'Open sessions',
  portal: 'Developer portal',
  portalSince: 'Since',
  noPortal: 'Not used',
  organizations: 'Organizations',
  noOrganization: 'Member of none.',
  platform: 'Platform',
  roles: { owner: 'Owner', manager: 'Manager', developer: 'Developer', reviewer: 'Reviewer', viewer: 'Viewer' },
  security: 'Access',
  sendReset: 'Send a password reset link',
  sendResetHelp: 'By email, valid one hour.',
  resetSent: 'Link sent.',
  signOut: 'Sign out everywhere',
  signOutHelp: 'Ends every session and the tokens apps hold for this person.',
  signedOut: 'Signed out everywhere.',
  resetTwoStep: 'Reset two-step sign-in',
  resetTwoStepHelp: 'For a lost phone: two-step goes off and the person sets it up again.',
  twoStepReset: 'Two-step sign-in is off.',
  disable: 'Disable the account',
  enable: 'Enable the account',
  disableHelp: 'A disabled account cannot sign in, and its sessions end.',
  disabled: 'The account is disabled.',
  enabled: 'The account is enabled.',
  adminGiven: 'Now an admin.',
  adminRemoved: 'No longer an admin.',
  makeAdmin: 'Make admin',
  removeAdmin: 'Remove the admin role',
  adminHelp: 'An admin opens this console.',
  superadminHelp: 'A superadmin is managed from the command line only.',
  yourselfHelp: 'Your own access is managed from your account page.',
  error: 'Something went wrong. Try again.',
};

/** The form's values: the engine widens a field to `string`, so the language is narrowed at submit. */
export type ProfileValues = Omit<UserEditInput, 'locale'> & { locale: string };

/** The form engine's root, typed per field. */
export interface ProfileForm extends ReactiveForm<ProfileValues> {
  get<K extends keyof ProfileValues>(key: K): FieldControl<ProfileValues[K]>;
}

export type ProfileAction = 'reset' | 'signOut' | 'twoStep' | 'disabled' | 'admin';

export interface UserProfileLogic {
  labels: () => UserProfileLabels;
  page: () => AdminUserPage | null;
  user: () => AdminUser | null;
  /** The console's user looks at their own account. */
  self: () => boolean;
  managesAdmins: () => boolean;
  date: (iso: string | null | undefined) => string;
  form: ProfileForm;
  save: (values: ProfileValues) => Promise<void>;
  /** The number while it is typed: kept without showing an error yet. */
  typePhone: (value: string) => void;
  locale: () => string;
  act: (action: ProfileAction) => Promise<void>;
  busy: () => boolean;
  /** What the last action did, in words. */
  notice: () => string | null;
  error: () => string | null;
}
