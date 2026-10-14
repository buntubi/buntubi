/**
 * Asks for a reset link. Once the host's `action` resolves the form gives way to a note: the
 * same note whether or not the address has an account.
 */
import { useView } from '@buntu/sdk/view';
import { ForgotPasswordView } from './view.js';
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { createField, createForm } from '@fluixi/forms';
import { signal } from '@fluixi/reactive/signal';
import { useElementAction, type ElementAction } from '../shared/element-action.js';
import { messageReader, type Messages } from '../shared/messages.js';
import { fieldValidator, type FormSchema } from '../shared/validators.js';
import '../shared/form.css';

export interface ForgotPassword {
  email: string;
}

export interface ForgotPasswordLabels {
  intro: string;
  email: string;
  submit: string;
  pending: string;
  sent: string;
}

export const forgotPasswordLabels: ForgotPasswordLabels = {
  intro: 'Enter your email address and we will send you a link to choose a new password.',
  email: 'Email address',
  submit: 'Send the link',
  pending: 'Sending',
  sent: 'If an account uses this address, a link to reset its password is on its way. Check your inbox.',
};

export interface ForgotPasswordEvents {
  submit: ForgotPassword;
  success: { result: unknown };
}

const props = {
  action: prop.any<ElementAction<ForgotPassword> | undefined>(undefined),
  schema: prop.any<FormSchema<ForgotPassword> | undefined>(undefined),
  labels: prop.object<ForgotPasswordLabels>(forgotPasswordLabels),
  messages: prop.object<Messages>({}),
};

export class IdpForgotPassword extends typedElement(props) {
  /** What the view draws from; a deployment can give its own view (UI plugin `views`). */
  logic() {
    const label = () => ({ ...forgotPasswordLabels, ...this.labels });
    const text = messageReader(() => this.messages);
    const sent = signal(false);
    const form = createForm({
      email: createField('', {
        validators: [fieldValidator<ForgotPassword, 'email'>(() => this.schema, 'email', text)],
      }),
    });
    const { run, pending, error } = useElementAction('idp-forgot-password', () => this.action, text);

    const submit = (values: ForgotPassword) => {
      this.emit('submit', values);
      if (!this.action) return;
      run(values).then(
        (result) => {
          sent.set(true);
          this.emit('success', { result });
        },
        () => {},
      );
    };

    return {
      error,
      form,
      label,
      pending,
      sent,
      submit,
    };
  }

  protected override render(): unknown {
    return useView(ForgotPasswordView)(this.logic());
  }
}

export type ForgotPasswordLogic = ReturnType<IdpForgotPassword['logic']>;

defineCustomElement('idp-forgot-password', IdpForgotPassword);

declare global {
  interface HTMLElementTagNameMap {
    'idp-forgot-password': IdpForgotPassword;
  }
  interface JSXCustomElements {
    'idp-forgot-password': ElementAttributes<typeof props, ForgotPasswordEvents>;
  }
}
