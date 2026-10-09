/**
 * An organization's people. Changes go through the injected `Developer` service; the host
 * refreshes the members and test users it invalidates.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/start/di';
import { Developer } from '@idp/sdk/developer';
import type { Member, Role } from '@idp/sdk/types';
import { useView } from '../view.js';
import { LIMITABLE, ROLES, teamLabels, type TeamLabels, type TeamLogic } from './logic.js';
import { TeamView } from './view.js';

const props = {
  organization: prop.string(''),
  members: prop.object<Member[]>([]),
  testUsers: prop.object<{ email: string; added_at: string }[]>([]),
  apps: prop.object<{ client_id: string; name: string }[]>([]),
  /** The reader's email, to mark their own row. */
  me: prop.string(''),
  canManage: prop.boolean(false),
  canManageTesters: prop.boolean(false),
  locale: prop.string('en'),
  labels: prop.object<Partial<TeamLabels>>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

export class IdpTeam extends typedElement(props) {
  protected override render(): unknown {
    const developer = inject(Developer);
    const labels = () => ({ ...teamLabels, ...this.labels });
    const busy = signal<string | null>(null);
    const error = signal<string | null>(null);
    const inviteEmail = signal('');
    const inviteRole = signal<Role>('developer');
    const editing = signal<string | null>(null);
    const picked = signal<string[]>([]);
    const testerEmail = signal('');
    const day = new Intl.DateTimeFormat(this.locale, { dateStyle: 'medium', timeZone: 'UTC' });
    const appName = (id: string) => this.apps.find((app) => app.client_id === id)?.name ?? id;

    const run = async (key: string, work: () => Promise<unknown>): Promise<boolean> => {
      busy.set(key);
      error.set(null);
      try {
        await work();
        return true;
      } catch (failure) {
        error.set(this.describe?.(failure) ?? labels().error);
        return false;
      } finally {
        busy.set(null);
      }
    };
    const organization = () => this.organization;

    const logic: TeamLogic = {
      labels,
      members: () =>
        this.members.map((member) => ({
          ...member,
          self: member.email === this.me,
          appNames: member.apps.map(appName),
          limitable: LIMITABLE.includes(member.role),
        })),
      canManage: () => this.canManage,
      canManageTesters: () => this.canManageTesters,
      changeRole: async (member, role) => {
        await run(member, () => developer.changeMember({ organization: organization(), member, role }));
      },
      remove: async (member) => {
        await run(member, () => developer.removeMember({ organization: organization(), member }));
      },
      inviteEmail,
      inviteRole,
      editInvite: (field, value) => {
        if (field === 'email') inviteEmail.set(value);
        else if (ROLES.includes(value as Role)) inviteRole.set(value as Role);
      },
      invite: async () => {
        const done = await run('invite', () =>
          developer.addMember({ organization: organization(), email: inviteEmail().trim(), role: inviteRole() }),
        );
        if (done) inviteEmail.set('');
      },
      editing,
      editAccess: (member) => {
        editing.set(member);
        picked.set(this.members.find((entry) => entry.id === member)?.apps ?? []);
      },
      accessChoices: () =>
        this.apps.map((app) => ({
          client_id: app.client_id,
          name: app.name,
          picked: picked().includes(app.client_id),
          toggle: () =>
            picked.set(picked().includes(app.client_id) ? picked().filter((id) => id !== app.client_id) : [...picked(), app.client_id]),
        })),
      saveAccess: async () => {
        const member = editing();
        if (!member) return;
        const done = await run(member, () => developer.changeMember({ organization: organization(), member, apps: picked() }));
        if (done) editing.set(null);
      },
      testers: () => this.testUsers.map((user) => ({ email: user.email, added: day.format(new Date(user.added_at)) })),
      testerEmail,
      editTester: (value) => testerEmail.set(value),
      addTester: async () => {
        const done = await run('tester', () => developer.addTestUser({ organization: organization(), email: testerEmail().trim() }));
        if (done) testerEmail.set('');
      },
      removeTester: async (email) => {
        await run(email, () => developer.removeTestUser({ organization: organization(), email }));
      },
      busy,
      error,
    };
    return useView(TeamView)(logic);
  }
}

defineCustomElement('idp-team', IdpTeam);

declare global {
  interface HTMLElementTagNameMap {
    'idp-team': IdpTeam;
  }
  interface JSXCustomElements {
    'idp-team': ElementAttributes<typeof props>;
  }
}
