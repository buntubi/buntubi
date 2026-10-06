/**
 * Account creation: first and last name, email, password. Validates, emits `submit`, runs the
 * host's `action`: `success` with its result, or the refusal it threw.
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

export interface SignUp {
  givenName: string;
  familyName: string;
  email: string;
  password: string;
}

export interface SignUpLabels {
  givenName: string;
  familyName: string;
  email: string;
  password: string;
  passwordHint: string;
  submit: string;
  pending: string;
}

export const signUpLabels: SignUpLabels = {
  givenName: 'First name',
  familyName: 'Last name',
  email: 'Email address',
  password: 'Password',
  passwordHint: 'At least 10 characters.',
  submit: 'Create my account',
  pending: 'Creating',
};

export interface SignUpEvents {
  submit: SignUp;
  success: { result: unknown };
}

const props = {
  action: prop.any<ElementAction<SignUp> | undefined>(undefined),
  schema: prop.any<FormSchema<SignUp> | undefined>(undefined),
  labels: prop.object<SignUpLabels>(signUpLabels),
  messages: prop.object<Messages>({}),
};

export class IdpSignUp extends typedElement(props) {
  protected override render(): unknown {
    const label = () => ({ ...signUpLabels, ...this.labels });
    const text = messageReader(() => this.messages);
    const validate = <K extends keyof SignUp & string>(key: K) => [
      fieldValidator<SignUp, K>(() => this.schema, key, text),
    ];
    const form = createForm({
      givenName: createField('', { validators: validate('givenName') }),
      familyName: createField('', { validators: validate('familyName') }),
      email: createField('', { validators: validate('email') }),
      password: createField('', { validators: validate('password') }),
    });
    const { run, pending, error } = useElementAction('idp-sign-up', () => this.action, text);

    const submit = (values: SignUp) => {
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
        <div class="idp-row">
          <FormField control={form.get('givenName')} label={() => label().givenName}>
            {(b) => (
              <Input name="given_name" autocomplete="given-name" value={b.value()} onInput={b.onInput} onBlur={b.onBlur} />
            )}
          </FormField>
          <FormField control={form.get('familyName')} label={() => label().familyName}>
            {(b) => (
              <Input name="family_name" autocomplete="family-name" value={b.value()} onInput={b.onInput} onBlur={b.onBlur} />
            )}
          </FormField>
        </div>
        <FormField control={form.get('email')} label={() => label().email}>
          {(b) => (
            <Input type="email" name="email" autocomplete="email" value={b.value()} onInput={b.onInput} onBlur={b.onBlur} />
          )}
        </FormField>
        <FormField control={form.get('password')} label={() => label().password} description={() => label().passwordHint}>
          {(b) => (
            <Input
              type="password"
              name="password"
              autocomplete="new-password"
              value={b.value()}
              onInput={b.onInput}
              onBlur={b.onBlur}
            />
          )}
        </FormField>
        <Button type="submit" variant="solid" data-part="submit" disabled={pending()}>
          {() => (pending() ? label().pending : label().submit)}
        </Button>
      </Form>
    );
  }
}

defineCustomElement('idp-sign-up', IdpSignUp);

declare global {
  interface HTMLElementTagNameMap {
    'idp-sign-up': IdpSignUp;
  }
  interface JSXCustomElements {
    'idp-sign-up': ElementAttributes<typeof props, SignUpEvents>;
  }
}
