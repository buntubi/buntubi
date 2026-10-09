/** The accounts, one row each; apart from the look. */
import type { AdminUser } from '@idp/sdk/types';
import type { UserRowLabels } from '../user-row/logic.js';

export interface UserListLogic {
  users: () => AdminUser[];
  empty: () => string;
  rowLabels: () => Partial<UserRowLabels>;
  describe: () => ((error: unknown) => string) | undefined;
}
