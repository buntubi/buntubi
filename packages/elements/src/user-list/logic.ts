/** The accounts as a table, one row each; apart from the look. */
import type { AdminUser } from '@idp/sdk/types';
import type { UserRowLabels } from '../user-row/logic.js';

export interface UserListLabels {
  /** What the table is, for assistive technology. */
  title: string;
  user: string;
  status: string;
  roles: string;
  twoStep: string;
  signedUp: string;
  lastSignIn: string;
  empty: string;
}

export const userListLabels: UserListLabels = {
  title: 'Users',
  user: 'User',
  status: 'Status',
  roles: 'Roles',
  twoStep: 'Two-step',
  signedUp: 'Signed up',
  lastSignIn: 'Last sign-in',
  empty: 'No user.',
};

export interface UserListLogic {
  labels: () => UserListLabels;
  users: () => AdminUser[];
  rowLabels: () => Partial<UserRowLabels>;
  describe: () => ((error: unknown) => string) | undefined;
  managesAdmins: () => boolean;
  href: () => string;
  locale: () => string;
}
