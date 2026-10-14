/** One member: who, their role, the apps they work on, whether they use two-step sign-in. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { signal } from '@fluixi/reactive/signal';
import type { Role } from '@buntubi/sdk/types';
import { teamLabels, type MemberRow, type TeamLabels } from '../team/logic.js';
import { initials } from '../initials.js';
import { useView } from '../view.js';
import type { MemberRowEvents, MemberRowLogic } from './logic.js';
import { MemberRowView } from './view.js';

const props = {
  member: prop.object<MemberRow | null>(null),
  /** The organization's apps, for limiting access. */
  apps: prop.object<{ client_id: string; name: string }[]>([]),
  canManage: prop.boolean(false),
  busy: prop.boolean(false),
  labels: prop.object<TeamLabels>(teamLabels),
};

export class IdpMemberRow extends typedElement(props) {
  protected override render(): unknown {
    const editing = signal(false);
    const picked = signal<string[]>([]);
    const logic: MemberRowLogic = {
      labels: () => this.labels,
      member: () => this.member,
      initials: () => initials(this.member?.name || this.member?.email),
      canManage: () => this.canManage && !this.member?.self,
      busy: () => this.busy,
      changeRole: (role) => this.emit('role', { role }),
      remove: () => this.emit('remove', {}),
      editing,
      edit: (open) => {
        picked.set(this.member?.apps ?? []);
        editing.set(open);
      },
      choices: () => this.apps.map((app) => ({ ...app, picked: picked().includes(app.client_id) })),
      toggle: (clientId) =>
        picked.set(picked().includes(clientId) ? picked().filter((id) => id !== clientId) : [...picked(), clientId]),
      saveAccess: () => {
        this.emit('access', { apps: picked() });
        editing.set(false);
      },
    };
    return useView(MemberRowView)(logic);
  }
}

defineCustomElement('idp-member-row', IdpMemberRow);

declare global {
  interface HTMLElementTagNameMap {
    'idp-member-row': IdpMemberRow;
  }
  interface JSXCustomElements {
    'idp-member-row': ElementAttributes<typeof props, MemberRowEvents>;
  }
}
