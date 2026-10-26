/** The sign-in methods card: providers linked for sign-in, linking another, unlinking; apart from the look. */
import type { LinkedIdentity } from '@buntubi/sdk/account';

export interface SignInMethodsLabels {
  title: string;
  about: string;
  empty: string;
  /** {date} it was linked. */
  linkedOn: string;
  /** {date} it was last used. */
  lastUsed: string;
  /** {provider}: the button that links one. */
  connect: string;
  remove: string;
  /** {provider} that was just linked. */
  connected: string;
  removed: string;
  /** Nothing else signs this account in: a password or a passkey first. */
  lastWayIn: string;
  error: string;
}

export const signInMethodsLabels: SignInMethodsLabels = {
  title: 'Sign-in with other accounts',
  about: 'Sign in with an account you already have elsewhere. Your account here stays the same.',
  empty: 'No account linked.',
  linkedOn: 'linked {date}',
  lastUsed: 'last used {date}',
  connect: 'Link {provider}',
  remove: 'Unlink',
  connected: '{provider} is linked.',
  removed: 'Unlinked.',
  lastWayIn: 'Add a password or a passkey before unlinking your only way in.',
  error: 'Something went wrong. Try again.',
};

export interface SignInMethodsLogic {
  labels: () => SignInMethodsLabels;
  identities: () => LinkedIdentity[];
  /** Providers not linked yet, each with its button text and where it leads. */
  available: () => { provider: string; label: string; href: string }[];
  /** "linked {date}, last used {date}" for one identity. */
  dates: (identity: LinkedIdentity) => string;
  remove: (identity: LinkedIdentity) => Promise<void>;
  busy: () => boolean;
  notice: () => string | null;
  error: () => string | null;
}
