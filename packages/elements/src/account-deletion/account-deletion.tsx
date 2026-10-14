/**
 * The account deletion card. The button waits for the account's address typed again; an
 * organization only this account owns, or being the last admin, stops it first. On success it
 * emits `leave` with where to go, the account being gone.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { createField, createForm } from '@fluixi/forms';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/di';
import { Account } from '@buntubi/sdk/account';
import { deleteAccountSchema, type DeleteAccountInput } from '@buntubi/sdk/schemas/account';
import { messageReader, type Messages } from '../messages.js';
import { fieldValidator, type FormSchema } from '../validators.js';
import { useView } from '../view.js';
import { accountDeletionLabels, type AccountDeletionLabels, type AccountDeletionLogic, type DeletionForm } from './logic.js';
import { AccountDeletionView } from './view.js';

const props = {
  email: prop.string(''),
  /** Organizations only this account owns. */
  organizations: prop.object<{ id: string; name: string }[]>([]),
  lastAdmin: prop.boolean(false),
  passwordNeeded: prop.boolean(false),
  /** Where organizations are managed; no link when empty. */
  portalHref: prop.string(''),
  schema: prop.any<FormSchema<DeleteAccountInput>>(deleteAccountSchema),
  labels: prop.object<Partial<AccountDeletionLabels>>({}),
  messages: prop.object<Messages>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

export interface AccountDeletionEvents {
  leave: { href: string };
}

export class IdpAccountDeletion extends typedElement(props) {
  protected override render(): unknown {
    const account = inject(Account);
    const labels = () => ({ ...accountDeletionLabels, ...this.labels });
    const text = messageReader(() => this.messages);
    const form: DeletionForm = createForm({
      email: createField('', { validators: [fieldValidator<DeleteAccountInput, 'email'>(() => this.schema, 'email', text)] }),
      password: createField(''),
    });
    const busy = signal(false);
    const error = signal<string | null>(null);
    const matches = () => !!this.email && form.get('email').value().trim().toLowerCase() === this.email.toLowerCase();
    const logic: AccountDeletionLogic = {
      labels,
      email: () => this.email,
      owned: () => this.organizations.map((o) => o.name).join(', '),
      portalHref: () => this.portalHref,
      lastAdmin: () => this.lastAdmin,
      blocked: () => this.organizations.length > 0 || this.lastAdmin,
      passwordNeeded: () => this.passwordNeeded,
      form,
      matches,
      remove: async (values) => {
        if (!matches()) return;
        if (this.passwordNeeded && !values.password) {
          error.set(text('form.required'));
          return;
        }
        busy.set(true);
        error.set(null);
        try {
          const href = await account.deleteAccount({ email: values.email.trim(), password: values.password || undefined });
          this.emit('leave', { href });
        } catch (failure) {
          error.set(this.describe?.(failure) ?? labels().error);
          busy.set(false);
        }
      },
      busy,
      error,
    };
    return useView(AccountDeletionView)(logic);
  }
}

defineCustomElement('idp-account-deletion', IdpAccountDeletion);

declare global {
  interface HTMLElementTagNameMap {
    'idp-account-deletion': IdpAccountDeletion;
  }
  interface JSXCustomElements {
    'idp-account-deletion': ElementAttributes<typeof props, AccountDeletionEvents>;
  }
}
