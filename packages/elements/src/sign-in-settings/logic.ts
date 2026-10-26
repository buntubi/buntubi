/** How people sign in on the deployment, read only: providers, sign-up, profile fields. */
import type { ProfileField } from '@buntubi/sdk/account';
import type { SignInSettings } from '@buntubi/sdk/types';

export interface SignInSettingsLabels {
  title: string;
  about: string;
  providers: string;
  /** In platform.toml and its client set: people see it. */
  offered: string;
  /** In platform.toml, its client missing from the env. */
  noClient: string;
  /** Its client set, not in platform.toml. */
  notListed: string;
  off: string;
  signup: string;
  signupOpen: string;
  signupInvited: string;
  profileFields: string;
  noFields: string;
  fields: Record<ProfileField, string>;
  modes: { optional: string; required: string };
}

export const signInSettingsLabels: SignInSettingsLabels = {
  title: 'Sign-in',
  about: 'Set in platform.toml and the provider env; each app can narrow the providers and close its own sign-up.',
  providers: 'Other accounts',
  offered: 'Offered',
  noClient: 'Listed, client not set',
  notListed: 'Client set, not listed',
  off: 'Off',
  signup: 'New accounts',
  signupOpen: 'Anyone can sign up',
  signupInvited: 'By invitation',
  profileFields: 'Profile fields',
  noFields: 'Name and email only',
  fields: {
    birthdate: 'Date of birth',
    gender: 'Gender',
    middle_name: 'Middle name',
    nickname: 'Nickname',
    website: 'Website',
    zoneinfo: 'Time zone',
  },
  modes: { optional: 'optional', required: 'required' },
};

export interface SignInSettingsLogic {
  labels: () => SignInSettingsLabels;
  settings: () => SignInSettings | null;
  /** One provider's state in words, and whether people see it. */
  state: (provider: SignInSettings['providers'][number]) => { text: string; on: boolean };
  /** The profile fields shown, as "Date of birth (required)". */
  fields: () => string[];
}
