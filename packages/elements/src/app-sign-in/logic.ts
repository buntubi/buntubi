import type { ProfileField } from '@buntubi/sdk/account';

/** How people sign in to one app: the deployment's providers it offers, and whether it takes sign-ups. */
export interface AppSignInLabels {
  title: string;
  intro: string;
  providers: string;
  /** The deployment offers none: nothing to choose. */
  noneOffered: string;
  signup: string;
  signupHelp: string;
  profileFields: string;
  profileFieldsHelp: string;
  /** The platform shows no profile field to ask for. */
  noProfileFields: string;
  /** Names of the standard fields; the platform's own carry theirs. */
  fields: Record<ProfileField, string>;
  saved: string;
  error: string;
}

export const appSignInLabels: AppSignInLabels = {
  title: 'Sign-in',
  intro: 'The other accounts people can sign in with on this app, among those the platform offers.',
  providers: 'Other accounts',
  noneOffered: 'The platform offers no other account to sign in with.',
  signup: 'Let people make an account',
  signupHelp: 'Off: only existing accounts and invited addresses sign in to this app.',
  profileFields: 'Profile fields this app needs',
  profileFieldsHelp: 'Someone without them is asked for them when they come to this app.',
  noProfileFields: 'The platform asks for no profile field beyond name and email.',
  fields: {
    birthdate: 'Date of birth',
    gender: 'Gender',
    middle_name: 'Middle name',
    nickname: 'Nickname',
    website: 'Website',
    zoneinfo: 'Time zone',
  },
  saved: 'Saved.',
  error: 'Something went wrong. Try again.',
};

export interface AppSignInLogic {
  labels: () => AppSignInLabels;
  offered: () => { id: string; label: string }[];
  /** Whether the app offers this provider; every one when it never chose. */
  offers: (id: string) => boolean;
  setOffers: (id: string, on: boolean) => void;
  signupOpen: () => boolean;
  setSignupOpen: (on: boolean) => void;
  /** The fields the platform shows, each with its name in the page's language. */
  fieldsOffered: () => { key: string; label: string }[];
  needs: (key: string) => boolean;
  setNeeds: (key: string, on: boolean) => void;
  canEdit: () => boolean;
  busy: () => boolean;
  saved: () => boolean;
  error: () => string | null;
}
