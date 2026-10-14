/**
 * Email and password sign-in. Validates, emits `submit`, and when the host set an `action`
 * runs it: `success` with its result, or the refusal it threw shown above the fields. With a
 * `passkeyAction` the email field also offers the browser's passkeys, and a button asks for one.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { onCleanup, onMount } from '@fluixi/core';
import { signal } from '@fluixi/reactive/signal';
import { passkeyAutofillSupported, passkeysSupported } from '@buntubi/sdk/webauthn';
import { createField, createForm } from '@fluixi/forms';
import { useView } from '@buntubi/sdk/view';
import { useElementAction, type ElementAction } from '../shared/element-action.js';
import { messageReader, type Messages } from '../shared/messages.js';
import { fieldValidator, type FormSchema } from '../shared/validators.js';
import '../shared/form.css';
import type { SignInLogic } from './logic.js';
import { SignInView } from './view.js';

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
  or: string;
  passkey: string;
  passkeyPending: string;
}

/** How the passkey is asked for: from the email field's suggestions, or by the button. */
export interface PasskeyRequest {
  conditional: boolean;
  signal?: AbortSignal;
}

export const signInLabels: SignInLabels = {
  email: 'Email address',
  password: 'Password',
  forgot: 'Forgot your password?',
  submit: 'Sign in',
  pending: 'Signing in',
  or: 'or',
  passkey: 'Sign in with a passkey',
  passkeyPending: 'Waiting for your device',
};

export interface SignInEvents {
  submit: SignIn;
  success: { result: unknown };
}

const props = {
  action: prop.any<ElementAction<SignIn> | undefined>(undefined),
  passkeyAction: prop.any<ElementAction<PasskeyRequest> | undefined>(undefined),
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
    const passkey = useElementAction('idp-sign-in-passkey', () => this.passkeyAction, text);
    const canPasskey = signal(false);
    let autofill: AbortController | undefined;
    // Browser checks, so in onMount. The email field's suggestions wait in the background until
    // the person picks a passkey there, or the button takes over.
    onMount(() => {
      if (!this.passkeyAction || !passkeysSupported()) return;
      canPasskey.set(true);
      void passkeyAutofillSupported().then((available) => {
        if (!available || !this.passkeyAction) return;
        autofill = new AbortController();
        Promise.resolve(this.passkeyAction({ conditional: true, signal: autofill.signal })).then(
          (result) => this.emit('success', { result }),
          () => {},
        );
      });
    });
    onCleanup(() => autofill?.abort());
    const askPasskey = () => {
      autofill?.abort();
      passkey.run({ conditional: false }).then(
        (result) => this.emit('success', { result }),
        () => {},
      );
    };

    const submit = (values: SignIn) => {
      this.emit('submit', values);
      if (!this.action) return;
      run(values).then(
        (result) => this.emit('success', { result }),
        () => {},
      );
    };

    const logic: SignInLogic = {
      form,
      labels: label,
      error,
      passkeyError: passkey.error,
      pending,
      passkeyPending: passkey.pending,
      canPasskey,
      forgotHref: () => this.forgotHref,
      submit,
      askPasskey,
    };
    return useView(SignInView)(logic);
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
