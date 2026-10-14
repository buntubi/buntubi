/** Choosing a new password from a reset link. The token is the host's; the element asks for the password twice. */
import { useView } from '@buntubi/sdk/view';
import { ResetPasswordView } from './view.js';
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { createField, createForm } from '@fluixi/forms';
import { useElementAction, type ElementAction } from '../shared/element-action.js';
import { messageReader, type Messages } from '../shared/messages.js';
import { fieldValidator, type FormSchema } from '../shared/validators.js';
import '../shared/form.css';

export interface ResetPassword {
  password: string;
  confirm: string;
}

export interface ResetPasswordLabels {
  password: string;
  passwordHint: string;
  confirm: string;
  mismatch: string;
  submit: string;
  pending: string;
}

export const resetPasswordLabels: ResetPasswordLabels = {
  password: 'New password',
  passwordHint: 'At least 10 characters.',
  confirm: 'Confirm the new password',
  mismatch: 'The two passwords differ.',
  submit: 'Save the new password',
  pending: 'Saving',
};

export interface ResetPasswordEvents {
  submit: { password: string };
  success: { result: unknown };
}

const props = {
  action: prop.any<ElementAction<{ password: string }> | undefined>(undefined),
  schema: prop.any<FormSchema<ResetPassword> | undefined>(undefined),
  labels: prop.object<ResetPasswordLabels>(resetPasswordLabels),
  messages: prop.object<Messages>({}),
};

export class IdpResetPassword extends typedElement(props) {
  /** What the view draws from; a deployment can give its own view (UI plugin `views`). */
  logic() {
    const label = () => ({ ...resetPasswordLabels, ...this.labels });
    const text = messageReader(() => this.messages);
    const password = createField('', {
      validators: [fieldValidator<ResetPassword, 'password'>(() => this.schema, 'password', text)],
    });
    const form = createForm({
      password,
      confirm: createField('', {
        validators: [
          (value: string) => (value === password.value() ? null : { type: 'mismatch', message: label().mismatch }),
        ],
      }),
    });
    const { run, pending, error } = useElementAction('idp-reset-password', () => this.action, text);

    const submit = (values: ResetPassword) => {
      const input = { password: values.password };
      this.emit('submit', input);
      if (!this.action) return;
      run(input).then(
        (result) => this.emit('success', { result }),
        () => {},
      );
    };

    return {
      error,
      form,
      label,
      password,
      pending,
      submit,
    };
  }

  protected override render(): unknown {
    return useView(ResetPasswordView)(this.logic());
  }
}

export type ResetPasswordLogic = ReturnType<IdpResetPassword['logic']>;

defineCustomElement('idp-reset-password', IdpResetPassword);

declare global {
  interface HTMLElementTagNameMap {
    'idp-reset-password': IdpResetPassword;
  }
  interface JSXCustomElements {
    'idp-reset-password': ElementAttributes<typeof props, ResetPasswordEvents>;
  }
}
