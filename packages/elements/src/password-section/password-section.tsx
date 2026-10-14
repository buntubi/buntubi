/**
 * The password card. Changing it needs the current one; signing out the other devices is offered
 * and on by default. Goes through the injected `Account` service.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { createField, createForm } from '@fluixi/forms';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/di';
import { Account } from '@buntu/sdk/account';
import { passwordChangeSchema, type PasswordChangeInput } from '@buntu/sdk/schemas/account';
import { shortDate } from '../dates.js';
import { messageReader, type Messages } from '../messages.js';
import { fieldValidator, type FormSchema } from '../validators.js';
import { useView } from '../view.js';
import { passwordSectionLabels, type PasswordForm, type PasswordSectionLabels, type PasswordSectionLogic } from './logic.js';
import { PasswordSectionView } from './view.js';

const props = {
  hasPassword: prop.boolean(true),
  /** ISO; empty: unchanged since the account was made. */
  changedAt: prop.string(''),
  locale: prop.string('en'),
  schema: prop.any<FormSchema<PasswordChangeInput>>(passwordChangeSchema),
  labels: prop.object<Partial<PasswordSectionLabels>>({}),
  messages: prop.object<Messages>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

export class IdpPasswordSection extends typedElement(props) {
  protected override render(): unknown {
    const account = inject(Account);
    const labels = () => ({ ...passwordSectionLabels, ...this.labels });
    const text = messageReader(() => this.messages);
    const check = <K extends keyof PasswordChangeInput & string>(field: K) =>
      fieldValidator<PasswordChangeInput, K>(() => this.schema, field, text);
    const form: PasswordForm = createForm({
      current_password: createField('', { validators: [check('current_password')] }),
      new_password: createField('', { validators: [check('new_password')] }),
    });
    const signOutOthers = signal(true);
    const editing = signal(false);
    const busy = signal(false);
    const notice = signal<string | null>(null);
    const error = signal<string | null>(null);
    const logic: PasswordSectionLogic = {
      labels,
      hasPassword: () => this.hasPassword,
      changed: () =>
        this.changedAt ? labels().changedOn.replace('{date}', shortDate(this.changedAt, this.locale)) : labels().neverChanged,
      editing,
      setEditing: (on) => {
        error.set(null);
        notice.set(null);
        if (on) {
          form.get('current_password').reset('');
          form.get('new_password').reset('');
          signOutOthers.set(true);
        }
        editing.set(on);
      },
      form,
      signOutOthers,
      setSignOutOthers: (on) => signOutOthers.set(on),
      save: async (values) => {
        busy.set(true);
        error.set(null);
        try {
          await account.changePassword({
            current_password: values.current_password,
            new_password: values.new_password,
            sign_out_others: signOutOthers(),
          });
          editing.set(false);
          notice.set(labels().saved);
        } catch (failure) {
          error.set(this.describe?.(failure) ?? labels().error);
        } finally {
          busy.set(false);
        }
      },
      busy,
      notice,
      error,
    };
    return useView(PasswordSectionView)(logic);
  }
}

defineCustomElement('idp-password-section', IdpPasswordSection);

declare global {
  interface HTMLElementTagNameMap {
    'idp-password-section': IdpPasswordSection;
  }
  interface JSXCustomElements {
    'idp-password-section': ElementAttributes<typeof props>;
  }
}
