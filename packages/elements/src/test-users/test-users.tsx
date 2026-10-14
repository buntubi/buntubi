/** An organization's test users: who may sign in to its sandbox apps, and adding or removing one. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { createField, createForm } from '@fluixi/forms';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/start/di';
import { Developer } from '@buntu/sdk/developer';
import { testUserSchema, type TestUserInput } from '@buntu/sdk/schemas/team';
import { messageReader, type Messages } from '../messages.js';
import { fieldValidator, type FormSchema } from '../validators.js';
import { teamLabels, type TeamLabels } from '../team/logic.js';
import { useView } from '../view.js';
import type { TestUserForm, TestUsersLogic } from './logic.js';
import { TestUsersView } from './view.js';

const props = {
  organization: prop.string(''),
  testUsers: prop.object<{ email: string; added_at: string }[]>([]),
  canManage: prop.boolean(false),
  locale: prop.string('en'),
  labels: prop.object<TeamLabels>(teamLabels),
  /** Checks the address before it is sent; messages are keys read through `messages`. */
  schema: prop.any<FormSchema<TestUserInput>>(testUserSchema),
  /** Text for validation keys; see messages.ts. */
  messages: prop.object<Messages>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

export class IdpTestUsers extends typedElement(props) {
  protected override render(): unknown {
    const developer = inject(Developer);
    const text = messageReader(() => this.messages);
    const form: TestUserForm = createForm({
      email: createField('', { validators: [fieldValidator<TestUserInput, 'email'>(() => this.schema, 'email', text)] }),
    });
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
      form,
      add: async (values) => {
        const added = await run('add', () => developer.addTestUser({ organization: this.organization, email: values.email.trim() }));
        if (added) form.get('email').reset('');
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
