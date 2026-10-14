/** One account for the platform owner: what it is, and whether it may sign in. */
import type { AdminUser } from '@buntu/sdk/types';

export interface UserRowLabels {
  admin: string;
  /** For a last sign-in that never happened. */
  never: string;
  /** For someone invited who has not chosen a password yet. */
  invited: string;
  superadmin: string;
  /** The row's menu, for assistive technology. */
  actions: string;
  makeAdmin: string;
  removeAdmin: string;
  developer: string;
  mfa: string;
  unverified: string;
  disabled: string;
  active: string;
  on: string;
  off: string;
  enable: string;
  disable: string;
  error: string;
}

export const userRowLabels: UserRowLabels = {
  admin: 'Admin',
  never: 'Never',
  invited: 'Invited',
  superadmin: 'Superadmin',
  actions: 'Actions',
  makeAdmin: 'Make admin',
  removeAdmin: 'Remove admin',
  developer: 'Developer',
  mfa: 'Two-step',
  unverified: 'Email not verified',
  disabled: 'Disabled',
  active: 'Active',
  on: 'On',
  off: 'Off',
  enable: 'Enable',
  disable: 'Disable',
  error: 'Something went wrong. Try again.',
};

export interface UserRowLogic {
  labels: () => UserRowLabels;
  user: () => AdminUser | null;
  /** The account's page. */
  href: () => string;
  signedUp: () => string;
  lastSignIn: () => string;
  name: () => string;
  initials: () => string;
  toggle: () => Promise<void>;
  /** Whoever is signed in may give and take the admin role: a superadmin. */
  managesAdmins: () => boolean;
  toggleAdmin: () => Promise<void>;
  busy: () => boolean;
  error: () => string | null;
}
