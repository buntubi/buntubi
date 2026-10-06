/**
 * Asks for a reset link. Once the host's `action` resolves the form gives way to a note: the
 * same note whether or not the address has an account.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { createField, createForm } from '@fluixi/forms';
import { signal } from '@fluixi/reactive/signal';
import { Form, FormField } from '@fluixi-ui/form';
import { Input } from '@fluixi-ui/input';
import { Button } from '@fluixi-ui/button';
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
  protected override render(): unknown {
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

    return () =>
      sent() ? (
        <div class="idp-form">
          <p class="idp-note" role="status">{label().sent}</p>
        </div>
      ) : (
        <Form form={form} onSubmit={submit} class="idp-form" novalidate>
          <p class="idp-note">{() => label().intro}</p>
          {() => (error() ? <p class="idp-alert" role="alert">{error()}</p> : null)}
          <FormField control={form.get('email')} label={() => label().email}>
            {(b) => (
              <Input type="email" name="email" autocomplete="email" value={b.value()} onInput={b.onInput} onBlur={b.onBlur} />
            )}
          </FormField>
          <Button type="submit" variant="solid" data-part="submit" disabled={pending()}>
            {() => (pending() ? label().pending : label().submit)}
          </Button>
        </Form>
      );
  }
}

defineCustomElement('idp-forgot-password', IdpForgotPassword);

declare global {
  interface HTMLElementTagNameMap {
    'idp-forgot-password': IdpForgotPassword;
  }
  interface JSXCustomElements {
    'idp-forgot-password': ElementAttributes<typeof props, ForgotPasswordEvents>;
  }
}
