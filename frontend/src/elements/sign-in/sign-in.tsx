/**
 * Email and password sign-in. Validates, emits `submit`, and when the host set an `action`
 * runs it: `success` with its result, or the refusal it threw shown above the fields.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { createField, createForm } from '@fluixi/forms';
import { Form, FormField } from '@fluixi-ui/form';
import { Input } from '@fluixi-ui/input';
import { Button } from '@fluixi-ui/button';
import { useElementAction, type ElementAction } from '../shared/element-action.js';
import { messageReader, type Messages } from '../shared/messages.js';
import { fieldValidator, type FormSchema } from '../shared/validators.js';
import '../shared/form.css';

export interface SignIn {
  email: string;
  password: string;
}

export interface SignInLabels {
  email: string;
  password: string;
  forgot: string;
  submit: string;
  pending: string;
}

export const signInLabels: SignInLabels = {
  email: 'Email address',
  password: 'Password',
  forgot: 'Forgot your password?',
  submit: 'Sign in',
  pending: 'Signing in',
};

export interface SignInEvents {
  submit: SignIn;
  success: { result: unknown };
}

const props = {
  action: prop.any<ElementAction<SignIn> | undefined>(undefined),
  schema: prop.any<FormSchema<SignIn> | undefined>(undefined),
  labels: prop.object<SignInLabels>(signInLabels),
  messages: prop.object<Messages>({}),
  /** Where "forgot your password" leads; hidden when empty. */
  forgotHref: prop.string(''),
};

export class IdpSignIn extends typedElement(props) {
  protected override render(): unknown {
    const label = () => ({ ...signInLabels, ...this.labels });
    const text = messageReader(() => this.messages);
    const form = createForm({
      email: createField('', { validators: [fieldValidator<SignIn, 'email'>(() => this.schema, 'email', text)] }),
      password: createField('', {
        validators: [fieldValidator<SignIn, 'password'>(() => this.schema, 'password', text)],
      }),
    });
    const { run, pending, error } = useElementAction('idp-sign-in', () => this.action, text);

    const submit = (values: SignIn) => {
      this.emit('submit', values);
      if (!this.action) return;
      run(values).then(
        (result) => this.emit('success', { result }),
        () => {},
      );
    };

    return (
      <Form form={form} onSubmit={submit} class="idp-form" novalidate>
        {() => (error() ? <p class="idp-alert" role="alert">{error()}</p> : null)}
        <FormField control={form.get('email')} label={() => label().email}>
          {(b) => (
            <Input type="email" name="email" autocomplete="username" value={b.value()} onInput={b.onInput} onBlur={b.onBlur} />
          )}
        </FormField>
        <FormField control={form.get('password')} label={() => label().password}>
          {(b) => (
            <Input
              type="password"
              name="password"
              autocomplete="current-password"
              value={b.value()}
              onInput={b.onInput}
              onBlur={b.onBlur}
            />
          )}
        </FormField>
        {() => (this.forgotHref ? <a class="idp-link" href={this.forgotHref}>{label().forgot}</a> : null)}
        <Button type="submit" variant="solid" data-part="submit" disabled={pending()}>
          {() => (pending() ? label().pending : label().submit)}
        </Button>
      </Form>
    );
  }
}

defineCustomElement('idp-sign-in', IdpSignIn);

declare global {
  interface HTMLElementTagNameMap {
    'idp-sign-in': IdpSignIn;
  }
  interface JSXCustomElements {
    'idp-sign-in': ElementAttributes<typeof props, SignInEvents>;
  }
}
