/**
 * An organization's members, one `idp-member-row` each, the way to invite someone, and what each
 * role may do. Changes go through the injected `Developer` service.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/start/di';
import { Developer } from '@idp/sdk/developer';
import type { Role } from '@idp/sdk/types';
import '../member-row/member-row.js';
import '../role-card/role-card.js';
import { ROLES, teamLabels, type MemberRow, type TeamLabels } from '../team/logic.js';
import { useView } from '../view.js';
import type { MembersLogic } from './logic.js';
import { MembersView } from './view.js';

const props = {
  organization: prop.string(''),
  members: prop.object<MemberRow[]>([]),
  apps: prop.object<{ client_id: string; name: string }[]>([]),
  canManage: prop.boolean(false),
  labels: prop.object<TeamLabels>(teamLabels),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

export class IdpMembers extends typedElement(props) {
  protected override render(): unknown {
    const developer = inject(Developer);
    const inviting = signal(false);
    const inviteEmail = signal('');
    const inviteRole = signal<Role>('developer');
    const busy = signal<string | null>(null);
    const error = signal<string | null>(null);
    const run = async (key: string, work: () => Promise<unknown>): Promise<boolean> => {
      busy.set(key);
      error.set(null);
      try {
        await work();
        return true;
      } catch (failure) {
        error.set(this.describe?.(failure) ?? this.labels.error);
        return false;
      } finally {
        busy.set(null);
      }
    };
    const logic: MembersLogic = {
      labels: () => this.labels,
      members: () => this.members,
      apps: () => this.apps,
      canManage: () => this.canManage,
      inviting,
      openInvite: (open) => inviting.set(open),
      inviteEmail,
      inviteRole,
      editInvite: (field, value) => {
        if (field === 'email') inviteEmail.set(value);
        else if (ROLES.includes(value as Role)) inviteRole.set(value as Role);
      },
      invite: async () => {
        const done = await run('invite', () =>
          developer.addMember({ organization: this.organization, email: inviteEmail().trim(), role: inviteRole() }),
        );
        if (done) {
          inviteEmail.set('');
          inviting.set(false);
        }
      },
      changeRole: async (member, role) => {
        await run(member, () => developer.changeMember({ organization: this.organization, member, role }));
      },
      changeAccess: async (member, apps) => {
        await run(member, () => developer.changeMember({ organization: this.organization, member, apps }));
      },
      remove: async (member) => {
        await run(member, () => developer.removeMember({ organization: this.organization, member }));
      },
      busy,
      error,
    };
    return useView(MembersView)(logic);
  }
}

defineCustomElement('idp-members', IdpMembers);

declare global {
  interface HTMLElementTagNameMap {
    'idp-members': IdpMembers;
  }
  interface JSXCustomElements {
    'idp-members': ElementAttributes<typeof props>;
  }
}
