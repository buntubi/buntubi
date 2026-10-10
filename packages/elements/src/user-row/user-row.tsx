/** One account, enabled or disabled through the injected `Admin` service. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/start/di';
import { Admin } from '@idp/sdk/admin';
import type { AdminUser } from '@idp/sdk/types';
import { initials } from '../initials.js';
import { useView } from '../view.js';
import { userRowLabels, type UserRowLabels, type UserRowLogic } from './logic.js';
import { UserRowView } from './view.js';

const props = {
  user: prop.object<AdminUser | null>(null),
  /** Shows the admin role actions: the console's user is a superadmin. */
  managesAdmins: prop.boolean(false),
  labels: prop.object<Partial<UserRowLabels>>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

export class IdpUserRow extends typedElement(props) {
  protected override render(): unknown {
    const admin = inject(Admin);
    const labels = () => ({ ...userRowLabels, ...this.labels });
    const busy = signal(false);
    const error = signal<string | null>(null);
    const run = async (change: (user: AdminUser) => Promise<void>) => {
      const u = this.user;
      if (!u) return;
      busy.set(true);
      error.set(null);
      try {
        await change(u);
      } catch (failure) {
        error.set(this.describe?.(failure) ?? labels().error);
      } finally {
        busy.set(false);
      }
    };
    const logic: UserRowLogic = {
      labels,
      user: () => this.user,
      name: () => {
        const u = this.user;
        return u ? `${u.given_name} ${u.family_name}`.trim() || u.email : '';
      },
      initials: () => {
        const u = this.user;
        return initials(u ? `${u.given_name} ${u.family_name}`.trim() || u.email : '');
      },
      toggle: () => run((u) => admin.setUserDisabled({ id: u.id, disabled: !u.disabled })),
      managesAdmins: () => this.managesAdmins,
      toggleAdmin: () => run((u) => admin.setAdmin({ id: u.id, admin: !u.roles.includes('admin') })),
      busy,
      error,
    };
    return useView(UserRowView)(logic);
  }
}

defineCustomElement('idp-user-row', IdpUserRow);

declare global {
  interface HTMLElementTagNameMap {
    'idp-user-row': IdpUserRow;
  }
  interface JSXCustomElements {
    'idp-user-row': ElementAttributes<typeof props>;
  }
}
