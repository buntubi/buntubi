/**
 * An organization's members, one `idp-member-row` each, the way to invite someone, and what each
 * role may do. Changes go through the injected `Developer` service.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { createField, createForm } from '@fluixi/forms';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/di';
import { Developer } from '@buntubi/sdk/developer';
import { memberInviteSchema, type MemberInviteInput } from '@buntubi/sdk/schemas/team';
import { messageReader, type Messages } from '../messages.js';
import { fieldValidator, type FormSchema } from '../validators.js';
import type { Invitation, Role } from '@buntubi/sdk/types';
import '../member-row/member-row.js';
import '../role-card/role-card.js';
import { ROLES, teamLabels, type MemberRow, type TeamLabels } from '../team/logic.js';
import { useView } from '../view.js';
import type { InviteForm, MembersLogic } from './logic.js';
import { MembersView } from './view.js';

const props = {
  organization: prop.string(''),
  members: prop.object<MemberRow[]>([]),
  invitations: prop.object<Invitation[]>([]),
  locale: prop.string('en'),
  apps: prop.object<{ client_id: string; name: string }[]>([]),
  canManage: prop.boolean(false),
  labels: prop.object<TeamLabels>(teamLabels),
  /** Checks an invitation before it is sent; messages are keys read through `messages`. */
  schema: prop.any<FormSchema<MemberInviteInput>>(memberInviteSchema),
  /** Text for validation keys; see messages.ts. */
  messages: prop.object<Messages>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

export class IdpMembers extends typedElement(props) {
  protected override render(): unknown {
    const developer = inject(Developer);
    const inviting = signal(false);
    const text = messageReader(() => this.messages);
    const inviteForm: InviteForm = createForm({
      email: createField('', { validators: [fieldValidator<MemberInviteInput, 'email'>(() => this.schema, 'email', text)] }),
      role: createField('developer'),
    });
    const busy = signal<string | null>(null);
    const error = signal<string | null>(null);
    const notice = signal<string | null>(null);
    const run = async (key: string, work: () => Promise<unknown>): Promise<boolean> => {
      busy.set(key);
      error.set(null);
      notice.set(null);
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
      invitations: () => this.invitations,
      locale: () => this.locale,
      withdraw: async (invitation) => {
        await run(invitation, () => developer.withdrawInvitation({ organization: this.organization, invitation }));
      },
      notice,
      apps: () => this.apps,
      canManage: () => this.canManage,
      inviting,
      openInvite: (open) => inviting.set(open),
      inviteForm,
      invite: async (values) => {
        const role: Role = ROLES.includes(values.role as Role) ? (values.role as Role) : 'developer';
        let answer: unknown = null;
        const done = await run('invite', async () => {
          answer = await developer.addMember({ organization: this.organization, email: values.email.trim(), role });
        });
        // No account yet: the person was sent an invitation rather than added.
        if (done && answer && typeof answer === 'object' && 'invited_at' in answer) {
          notice.set(this.labels.invited.replace('{email}', (answer as Invitation).email));
        }
        if (done) {
          inviteForm.get('email').reset('');
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
