/** One account for the platform owner: what it is, and whether it may sign in. */
import type { AdminUser } from '@idp/sdk/types';

export interface UserRowLabels {
  admin: string;
  developer: string;
  mfa: string;
  unverified: string;
  disabled: string;
  enable: string;
  disable: string;
  error: string;
}

export const userRowLabels: UserRowLabels = {
  admin: 'Admin',
  developer: 'Developer',
  mfa: 'Two-step',
  unverified: 'Email not verified',
  disabled: 'Disabled',
  enable: 'Enable',
  disable: 'Disable',
  error: 'Something went wrong. Try again.',
};

export interface UserRowLogic {
  labels: () => UserRowLabels;
  user: () => AdminUser | null;
  name: () => string;
  toggle: () => Promise<void>;
  busy: () => boolean;
  error: () => string | null;
}
