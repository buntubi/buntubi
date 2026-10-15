/**
 * An organization's people: its name and counts, and a tab for its members or its test users.
 * Each part is its own element; this one keeps the tab and lays them out.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { signal } from '@fluixi/reactive/signal';
import type { Invitation, Member } from '@buntubi/sdk/types';
import '../members/members.js';
import '../segmented/segmented.js';
import '../test-users/test-users.js';
import type { Messages } from '../messages.js';
import { useView } from '../view.js';
import { LIMITABLE, positionOf, teamLabels, type TeamLabels, type TeamLogic } from './logic.js';
import { TeamView } from './view.js';

const props = {
  organization: prop.string(''),
  /** The organization's name, for the header. */
  name: prop.string(''),
  members: prop.object<Member[]>([]),
  /** Addresses asked to join that have no account yet. */
  invitations: prop.object<Invitation[]>([]),
  testUsers: prop.object<{ email: string; added_at: string }[]>([]),
  apps: prop.object<{ client_id: string; name: string }[]>([]),
  /** The signed-in person's email, to mark their own row. */
  me: prop.string(''),
  canManage: prop.boolean(false),
  canManageTesters: prop.boolean(false),
  locale: prop.string('en'),
  labels: prop.object<Partial<TeamLabels>>({}),
  /** Text for validation keys, handed to the members and test users; see messages.ts. */
  messages: prop.object<Messages>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

export class IdpTeam extends typedElement(props) {
  protected override render(): unknown {
    const labels = () => ({ ...teamLabels, ...this.labels });
    const tab = signal('members');
    const appName = (id: string) => this.apps.find((app) => app.client_id === id)?.name ?? id;
    const logic: TeamLogic = {
      labels,
      name: () => this.name,
      mark: () => (this.name.trim()[0] ?? 'O').toUpperCase(),
      counts: () =>
        labels().counts.replace('{apps}', String(this.apps.length)).replace('{members}', String(this.members.length)),
      tab,
      tabs: () => [
        { value: 'members', label: labels().tabs.members },
        { value: 'testers', label: labels().tabs.testers },
      ],
      choose: (value) => tab.set(value),
      organization: () => this.organization,
      invitations: () => this.invitations,
      members: () =>
        this.members.map((member) => ({
          ...member,
          self: member.email === this.me,
          appNames: member.apps.map(appName),
          limitable: LIMITABLE.includes(positionOf(member)),
        })),
      apps: () => this.apps,
      testUsers: () => this.testUsers,
      canManage: () => this.canManage,
      canManageTesters: () => this.canManageTesters,
      locale: () => this.locale,
      describe: () => this.describe,
      messages: () => this.messages,
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
