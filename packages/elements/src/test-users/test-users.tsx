/** An organization's test users: who may sign in to its sandbox apps, and adding or removing one. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/start/di';
import { Developer } from '@idp/sdk/developer';
import { teamLabels, type TeamLabels } from '../team/logic.js';
import { useView } from '../view.js';
import type { TestUsersLogic } from './logic.js';
import { TestUsersView } from './view.js';

const props = {
  organization: prop.string(''),
  testUsers: prop.object<{ email: string; added_at: string }[]>([]),
  canManage: prop.boolean(false),
  locale: prop.string('en'),
  labels: prop.object<TeamLabels>(teamLabels),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

export class IdpTestUsers extends typedElement(props) {
  protected override render(): unknown {
    const developer = inject(Developer);
    const email = signal('');
    const busy = signal<string | null>(null);
    const error = signal<string | null>(null);
    const day = new Intl.DateTimeFormat(this.locale, { dateStyle: 'medium', timeZone: 'UTC' });
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
    const logic: TestUsersLogic = {
      labels: () => this.labels,
      testers: () => this.testUsers.map((user) => ({ email: user.email, added: day.format(new Date(user.added_at)) })),
      canManage: () => this.canManage,
      email,
      edit: (value) => email.set(value),
      add: async () => {
        if (await run('add', () => developer.addTestUser({ organization: this.organization, email: email().trim() }))) email.set('');
      },
      remove: async (address) => {
        await run(address, () => developer.removeTestUser({ organization: this.organization, email: address }));
      },
      busy,
      error,
    };
    return useView(TestUsersView)(logic);
  }
}

defineCustomElement('idp-test-users', IdpTestUsers);

declare global {
  interface HTMLElementTagNameMap {
    'idp-test-users': IdpTestUsers;
  }
  interface JSXCustomElements {
    'idp-test-users': ElementAttributes<typeof props>;
  }
}
