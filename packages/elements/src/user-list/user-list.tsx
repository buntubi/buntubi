/** Every account as a table, one `idp-user-row` each, in a card. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import type { AdminUser } from '@idp/sdk/types';
import '../user-row/user-row.js';
import type { UserRowLabels } from '../user-row/logic.js';
import { useView } from '../view.js';
import { userListLabels, type UserListLabels, type UserListLogic } from './logic.js';
import { UserListView } from './view.js';

const props = {
  users: prop.object<AdminUser[]>([]),
  labels: prop.object<Partial<UserListLabels>>({}),
  /** Handed to every row. */
  rowLabels: prop.object<Partial<UserRowLabels>>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
  /** Handed to every row: the admin role actions show for a superadmin. */
  managesAdmins: prop.boolean(false),
};

export class IdpUserList extends typedElement(props) {
  protected override render(): unknown {
    const logic: UserListLogic = {
      users: () => this.users,
      labels: () => ({ ...userListLabels, ...this.labels }),
      rowLabels: () => this.rowLabels,
      describe: () => this.describe,
      managesAdmins: () => this.managesAdmins,
    };
    return useView(UserListView)(logic);
  }
}

defineCustomElement('idp-user-list', IdpUserList);

declare global {
  interface HTMLElementTagNameMap {
    'idp-user-list': IdpUserList;
  }
  interface JSXCustomElements {
    'idp-user-list': ElementAttributes<typeof props>;
  }
}
