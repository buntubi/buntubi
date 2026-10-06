/**
 * Two-step sign-in on the account page. Off: a button starts enrolment, which shows the QR code
 * and the secret, then takes a first code. Just turned on, or renewed: the backup codes, shown
 * this once. On: how many backup codes are left, renew them or turn the second step off, both
 * with a current code. Every change emits `change` with the new state.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { For, Match, Show, Switch } from '@fluixi/core';
import { signal } from '@fluixi/reactive/signal';
import { Input } from '@fluixi-ui/input';
import { Button } from '@fluixi-ui/button';
import { useElementAction, type ElementAction } from '../shared/element-action.js';
import { messageReader, type Messages } from '../shared/messages.js';
import '../shared/form.css';
import './mfa-setup.css';

export interface MfaEnrolment {
  qr: string;
  secret: string;
}

export interface MfaSetupLabels {
  off: string;
  start: string;
  scan: string;
  manual: string;
  code: string;
  confirm: string;
  cancel: string;
  saveCodes: string;
  copy: string;
  copied: string;
  done: string;
  on: string;
  codesLeft: string;
  renew: string;
  disable: string;
  confirmWithCode: string;
  pending: string;
}

export const mfaSetupLabels: MfaSetupLabels = {
  off: 'Add a second step to your sign-in: a code from an authenticator app on your phone.',
  start: 'Set up two-step sign-in',
  scan: 'Scan this code with your authenticator app, then enter the 6-digit code it shows.',
  manual: 'Or type this key into the app:',
  code: 'Code from the app',
  confirm: 'Turn on',
  cancel: 'Cancel',
  saveCodes: 'Save these backup codes somewhere safe. Each one signs you in once if you lose your phone. They will not be shown again.',
  copy: 'Copy the codes',
  copied: 'Copied',
  done: 'I saved them',
  on: 'Two-step sign-in is on.',
  codesLeft: 'Backup codes left:',
  renew: 'New backup codes',
  disable: 'Turn off',
  confirmWithCode: 'Enter a code from the app to confirm.',
  pending: 'One moment',
};

export interface MfaSetupEvents {
  change: { enabled: boolean };
}

type Mode = 'idle' | 'enrolling' | 'codes' | 'renew' | 'disable';

const props = {
  enabled: prop.boolean(false),
  backupCodesLeft: prop.number(0),
  beginAction: prop.any<ElementAction<Record<string, never>, MfaEnrolment> | undefined>(undefined),
  confirmAction: prop.any<ElementAction<{ code: string }, { backup_codes: string[] }> | undefined>(undefined),
  renewAction: prop.any<ElementAction<{ code: string }, { backup_codes: string[] }> | undefined>(undefined),
  disableAction: prop.any<ElementAction<{ code: string }> | undefined>(undefined),
  labels: prop.object<MfaSetupLabels>(mfaSetupLabels),
  messages: prop.object<Messages>({}),
};

export class IdpMfaSetup extends typedElement(props) {
  protected override render(): unknown {
    const label = () => ({ ...mfaSetupLabels, ...this.labels });
    const text = messageReader(() => this.messages);
    const enabled = signal(this.enabled);
    const left = signal(this.backupCodesLeft);
    const mode = signal<Mode>('idle');
    const enrolment = signal<MfaEnrolment | null>(null);
    const codes = signal<string[]>([]);
    const code = signal('');
    const copied = signal(false);
    const work = useElementAction('idp-mfa-setup', (): ElementAction<() => Promise<unknown>> => (step) => step(), text);

    const go = (next: Mode) => {
      code.set('');
      copied.set(false);
      mode.set(next);
    };
    const showCodes = (list: string[]) => {
      codes.set(list);
      left.set(list.length);
      go('codes');
    };

    const begin = () =>
      work.run(async () => {
        const started = await this.beginAction?.({});
        if (!started) return;
        enrolment.set(started);
        go('enrolling');
      });
    const confirm = () =>
      work.run(async () => {
        const result = await this.confirmAction?.({ code: code().trim() });
        if (!result) return;
        enabled.set(true);
        this.emit('change', { enabled: true });
        showCodes(result.backup_codes);
      });
    const renew = () =>
      work.run(async () => {
        const result = await this.renewAction?.({ code: code().trim() });
        if (result) showCodes(result.backup_codes);
      });
    const disable = () =>
      work.run(async () => {
        await this.disableAction?.({ code: code().trim() });
        enabled.set(false);
        this.emit('change', { enabled: false });
        go('idle');
      });
    const copy = () =>
      navigator.clipboard?.writeText(codes().join('\n')).then(
        () => copied.set(true),
        () => {},
      );

    const codeField = () => (
      <Input
        name="code"
        inputmode="numeric"
        autocomplete="one-time-code"
        aria-label={label().code}
        placeholder="000000"
        value={code()}
        onInput={(event: InputEvent) => code.set((event.currentTarget as HTMLInputElement).value)}
      />
    );
    const error = () => (work.error() ? <p class="idp-alert" role="alert">{work.error()}</p> : null);

    return (
      <div class="idp-form idp-mfa">
        <Switch
          fallback={
            <Show
              when={enabled()}
              fallback={
                <div class="idp-form">
                  <p class="idp-note">{() => label().off}</p>
                  {error}
                  <Button type="button" variant="solid" class="idp-wide" disabled={work.pending()} onPress={begin}>
                    {() => label().start}
                  </Button>
                </div>
              }
            >
              <div class="idp-form">
                <p class="idp-note">
                  {() => label().on} {() => label().codesLeft} <strong>{() => left()}</strong>
                </p>
                <div class="idp-actions">
                  <Button type="button" variant="outline" onPress={() => go('renew')}>
                    {() => label().renew}
                  </Button>
                  <Button type="button" variant="outline" onPress={() => go('disable')}>
                    {() => label().disable}
                  </Button>
                </div>
              </div>
            </Show>
          }
        >
          <Match when={mode() === 'enrolling'}>
            <div class="idp-form">
              <p class="idp-note">{() => label().scan}</p>
              <img class="idp-mfa-qr" src={enrolment()?.qr ?? ''} alt="" width="180" height="180" />
              <p class="idp-note">
                {() => label().manual} <code class="idp-mfa-secret">{() => enrolment()?.secret ?? ''}</code>
              </p>
              {error}
              {codeField()}
              <div class="idp-actions">
                <Button type="button" variant="outline" onPress={() => go('idle')}>
                  {() => label().cancel}
                </Button>
                <Button type="button" variant="solid" disabled={work.pending()} onPress={confirm}>
                  {() => (work.pending() ? label().pending : label().confirm)}
                </Button>
              </div>
            </div>
          </Match>
          <Match when={mode() === 'codes'}>
            <div class="idp-form">
              <p class="idp-note">{() => label().saveCodes}</p>
              <ol class="idp-mfa-codes">
                <For each={codes()}>{(item) => <li>{item}</li>}</For>
              </ol>
              <div class="idp-actions">
                <Button type="button" variant="outline" onPress={copy}>
                  {() => (copied() ? label().copied : label().copy)}
                </Button>
                <Button type="button" variant="solid" onPress={() => go('idle')}>
                  {() => label().done}
                </Button>
              </div>
            </div>
          </Match>
          <Match when={mode() === 'renew' || mode() === 'disable'}>
            <div class="idp-form">
              <p class="idp-note">{() => label().confirmWithCode}</p>
              {error}
              {codeField()}
              <div class="idp-actions">
                <Button type="button" variant="outline" onPress={() => go('idle')}>
                  {() => label().cancel}
                </Button>
                <Button
                  type="button"
                  variant="solid"
                  disabled={work.pending()}
                  onPress={() => (mode() === 'renew' ? renew() : disable())}
                >
                  {() => (work.pending() ? label().pending : mode() === 'renew' ? label().renew : label().disable)}
                </Button>
              </div>
            </div>
          </Match>
        </Switch>
      </div>
    );
  }
}

defineCustomElement('idp-mfa-setup', IdpMfaSetup);

declare global {
  interface HTMLElementTagNameMap {
    'idp-mfa-setup': IdpMfaSetup;
  }
  interface JSXCustomElements {
    'idp-mfa-setup': ElementAttributes<typeof props, MfaSetupEvents>;
  }
}
