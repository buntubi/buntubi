/** The accounts signed in on this browser, as the header's menu; apart from the look. */
import type { BrowserAccount } from '@buntubi/sdk/account';

export interface AccountSwitcherLabels {
  /** The menu button, for assistive technology: "Accounts". */
  menu: string;
  signedInHere: string;
  current: string;
  switchTo: string;
  /** "Sign out of {email}". */
  signOutOf: string;
  addAccount: string;
  signOutAll: string;
  error: string;
}

export const accountSwitcherLabels: AccountSwitcherLabels = {
  menu: 'Accounts',
  signedInHere: 'Signed in on this browser',
  current: 'Current',
  switchTo: 'Switch',
  signOutOf: 'Sign out of {email}',
  addAccount: 'Add another account',
  signOutAll: 'Sign out of all accounts',
  error: 'Something went wrong. Try again.',
};

export interface AccountSwitcherLogic {
  labels: () => AccountSwitcherLabels;
  accounts: () => BrowserAccount[];
  current: () => BrowserAccount | null;
  initials: (account: BrowserAccount) => string;
  addHref: () => string;
  switchTo: (id: string) => Promise<void>;
  signOut: (id: string) => Promise<void>;
  signOutAll: () => Promise<void>;
  busy: () => string | null;
  error: () => string | null;
}

export interface AccountSwitcherEvents {
  /** The answer is another page: the host loads it (another account, or signed out). */
  leave: { href: string };
}
