/**
 * The 6-digit code sent by email. Submits on its own once every cell is filled; `resend` asks
 * the host for a new code. `success` carries the action's result.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { signal } from '@fluixi/reactive/signal';
import { PinInput } from '@fluixi-ui/pin-input';
import { Button } from '@fluixi-ui/button';
import { useElementAction, type ElementAction } from '../shared/element-action.js';
import { messageReader, type Messages } from '../shared/messages.js';
import '../shared/form.css';

export interface VerifyEmail {
  code: string;
}

export interface VerifyEmailLabels {
  sentTo: string;
  code: string;
  submit: string;
  pending: string;
  resend: string;
  resent: string;
}

export const verifyEmailLabels: VerifyEmailLabels = {
  sentTo: 'We sent a 6-digit code to',
  code: 'Verification code',
  submit: 'Verify',
  pending: 'Verifying',
  resend: 'Send a new code',
  resent: 'A new code is on its way.',
};

export interface VerifyEmailEvents {
  submit: VerifyEmail;
  success: { result: unknown };
  resend: Record<string, never>;
}

const CODE_LENGTH = 6;

const props = {
  email: prop.string(''),
  action: prop.any<ElementAction<VerifyEmail> | undefined>(undefined),
  /** Sends a new code. */
  resendAction: prop.any<ElementAction<Record<string, never>> | undefined>(undefined),
  labels: prop.object<VerifyEmailLabels>(verifyEmailLabels),
  messages: prop.object<Messages>({}),
};

export class IdpVerifyEmail extends typedElement(props) {
  protected override render(): unknown {
    const label = () => ({ ...verifyEmailLabels, ...this.labels });
    const text = messageReader(() => this.messages);
    const code = signal('');
    const invalid = signal(false);
    const resent = signal(false);
    const verify = useElementAction('idp-verify-email', () => this.action, text);
    const resend = useElementAction('idp-verify-email-resend', () => this.resendAction, text);

    const submit = () => {
      if (verify.pending()) return;
      if (code().length !== CODE_LENGTH) {
        invalid.set(true);
        return;
      }
      invalid.set(false);
      const values = { code: code() };
      this.emit('submit', values);
      if (!this.action) return;
      verify.run(values).then(
        (result) => this.emit('success', { result }),
        () => code.set(''),
      );
    };

    const askAgain = () => {
      resent.set(false);
      this.emit('resend', {});
      resend.run({}).then(
        () => resent.set(true),
        () => {},
      );
    };

    const problem = () => (invalid() ? text('form.code') : (verify.error() ?? resend.error()));

    return (
      <form
        class="idp-form"
        novalidate
        onSubmit={(event: SubmitEvent) => {
          event.preventDefault();
          submit();
        }}
      >
        <p class="idp-note">
          {() => label().sentTo} <strong>{() => this.email}</strong>
        </p>
        {() => (problem() ? <p class="idp-alert" role="alert">{problem()}</p> : null)}
        {() => (resent() ? <p class="idp-note" role="status">{label().resent}</p> : null)}
        <PinInput
          class="idp-code"
          length={CODE_LENGTH}
          otp
          aria-label={() => label().code}
          value={code()}
          onValueChange={(value: string) => code.set(value)}
          onComplete={submit}
        />
        <Button type="submit" variant="solid" data-part="submit" disabled={verify.pending()}>
          {() => (verify.pending() ? label().pending : label().submit)}
        </Button>
        <Button type="button" variant="ghost" disabled={resend.pending()} onPress={askAgain}>
          {() => label().resend}
        </Button>
      </form>
    );
  }
}

defineCustomElement('idp-verify-email', IdpVerifyEmail);

declare global {
  interface HTMLElementTagNameMap {
    'idp-verify-email': IdpVerifyEmail;
  }
  interface JSXCustomElements {
    'idp-verify-email': ElementAttributes<typeof props, VerifyEmailEvents>;
  }
}
