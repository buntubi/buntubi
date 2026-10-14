/**
 * The second step of a sign-in: the 6-digit code from the authenticator app, or a backup code
 * when the phone is not at hand. `success` carries the action's result.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { onMount, Show } from '@fluixi/core';
import { passkeysSupported } from '@buntu/sdk/webauthn';
import { signal } from '@fluixi/reactive/signal';
import { PinInput } from '@fluixi-ui/pin-input';
import { Input } from '@fluixi-ui/input';
import { Button } from '@fluixi-ui/button';
import { useElementAction, type ElementAction } from '../shared/element-action.js';
import { messageReader, type Messages } from '../shared/messages.js';
import '../shared/form.css';

export interface MfaCode {
  code: string;
}

export interface MfaVerifyLabels {
  intro: string;
  backupIntro: string;
  code: string;
  backupCode: string;
  submit: string;
  pending: string;
  useBackup: string;
  useApp: string;
  usePasskey: string;
  passkeyPending: string;
}

export const mfaVerifyLabels: MfaVerifyLabels = {
  intro: 'Enter the 6-digit code from your authenticator app.',
  backupIntro: 'Enter one of the backup codes you saved. Each one works once.',
  code: 'Authentication code',
  backupCode: 'Backup code',
  submit: 'Continue',
  pending: 'Checking',
  useBackup: 'Use a backup code',
  useApp: 'Use the authenticator app',
  usePasskey: 'Use a passkey',
  passkeyPending: 'Waiting for your device',
};

export interface MfaVerifyEvents {
  submit: MfaCode;
  success: { result: unknown };
}

const props = {
  action: prop.any<ElementAction<MfaCode> | undefined>(undefined),
  /** Answers the step with one of the person's passkeys; offered when `hasPasskey`. */
  passkeyAction: prop.any<ElementAction<void> | undefined>(undefined),
  hasPasskey: prop.boolean(false),
  labels: prop.object<MfaVerifyLabels>(mfaVerifyLabels),
  messages: prop.object<Messages>({}),
};

export class IdpMfaVerify extends typedElement(props) {
  protected override render(): unknown {
    const label = () => ({ ...mfaVerifyLabels, ...this.labels });
    const text = messageReader(() => this.messages);
    const backup = signal(false);
    const code = signal('');
    const invalid = signal(false);
    const { run, pending, error } = useElementAction('idp-mfa-verify', () => this.action, text);
    const passkey = useElementAction('idp-mfa-verify-passkey', () => this.passkeyAction, text);
    // A browser check, so in onMount.
    const canPasskey = signal(false);
    onMount(() => canPasskey.set(this.hasPasskey && !!this.passkeyAction && passkeysSupported()));
    const askPasskey = () =>
      passkey.run(undefined).then(
        (result) => this.emit('success', { result }),
        () => {},
      );

    const submit = () => {
      if (pending()) return;
      const value = code().trim();
      const ok = backup() ? value.replace(/[^a-z0-9]/gi, '').length === 8 : /^\d{6}$/.test(value);
      invalid.set(!ok);
      if (!ok) return;
      this.emit('submit', { code: value });
      if (!this.action) return;
      run({ code: value }).then(
        (result) => this.emit('success', { result }),
        () => code.set(''),
      );
    };

    const toggle = () => {
      backup.set(!backup());
      code.set('');
      invalid.set(false);
    };

    const problem = () => (invalid() ? text(backup() ? 'form.backupCode' : 'form.code') : error() ?? passkey.error());

    return (
      <form
        class="idp-form"
        novalidate
        onSubmit={(event: SubmitEvent) => {
          event.preventDefault();
          submit();
        }}
      >
        <p class="idp-note">{() => (backup() ? label().backupIntro : label().intro)}</p>
        {() => (problem() ? <p class="idp-alert" role="alert">{problem()}</p> : null)}
        <Show
          when={backup()}
          fallback={
            <PinInput
              class="idp-code"
              length={6}
              otp
              aria-label={label().code}
              value={code()}
              onValueChange={(value: string) => code.set(value)}
              onComplete={submit}
            />
          }
        >
          {() => (
            <Input
              name="backup_code"
              autocomplete="off"
              aria-label={label().backupCode}
              placeholder="XXXX-XXXX"
              value={code()}
              onInput={(event: InputEvent) => code.set((event.currentTarget as HTMLInputElement).value)}
            />
          )}
        </Show>
        <Button type="submit" variant="solid" data-part="submit" disabled={pending()}>
          {() => (pending() ? label().pending : label().submit)}
        </Button>
        <Show when={canPasskey()}>
          <Button type="button" variant="outline" tone="neutral" data-part="passkey" disabled={passkey.pending()} onPress={askPasskey}>
            {() => (passkey.pending() ? label().passkeyPending : label().usePasskey)}
          </Button>
        </Show>
        <Button type="button" variant="ghost" onPress={toggle}>
          {() => (backup() ? label().useApp : label().useBackup)}
        </Button>
      </form>
    );
  }
}

defineCustomElement('idp-mfa-verify', IdpMfaVerify);

declare global {
  interface HTMLElementTagNameMap {
    'idp-mfa-verify': IdpMfaVerify;
  }
  interface JSXCustomElements {
    'idp-mfa-verify': ElementAttributes<typeof props, MfaVerifyEvents>;
  }
}
