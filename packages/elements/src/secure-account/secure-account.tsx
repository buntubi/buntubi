/**
 * Offered once after signing up: a passkey, or two-step sign-in with an authenticator app, or
 * not now. The passkey is made in place; the app is set up with `idp-two-step-section`. Both go
 * through the injected `Account` service. `answer` says the person is done here.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { onMount } from '@fluixi/core';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/di';
import { Account } from '@buntubi/sdk/account';
import { passkeysSupported } from '@buntubi/sdk/webauthn';
import type { Messages } from '../messages.js';
import type { TwoStepSectionLabels } from '../two-step-section/logic.js';
import { useView } from '../view.js';
import { secureAccountLabels, type SecureAccountEvents, type SecureAccountLabels, type SecureAccountLogic, type SecureAccountStep } from './logic.js';
import { SecureAccountView } from './view.js';
import '../secure-option/secure-option.js';
import '../two-step-section/two-step-section.js';

const props = {
  locale: prop.string('en'),
  labels: prop.object<Partial<SecureAccountLabels>>({}),
  twoStepLabels: prop.object<Partial<TwoStepSectionLabels>>({}),
  messages: prop.object<Messages>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

export class IdpSecureAccount extends typedElement(props) {
  protected override render(): unknown {
    const account = inject(Account);
    const labels = () => ({ ...secureAccountLabels, ...this.labels });
    const step = signal<SecureAccountStep>('choose');
    const done = signal('');
    const supported = signal(false);
    const busy = signal(false);
    const error = signal<string | null>(null);
    onMount(() => supported.set(passkeysSupported()));
    const finish = (message: string) => {
      done.set(message);
      step.set('done');
    };
    const logic: SecureAccountLogic = {
      labels,
      twoStepLabels: () => this.twoStepLabels,
      step,
      passkeys: supported,
      done,
      addPasskey: async () => {
        busy.set(true);
        error.set(null);
        try {
          await account.addPasskey();
          finish(labels().passkeyDone);
        } catch (failure) {
          // Closing the browser's sheet is a choice, not a failure.
          if (!(failure instanceof Error && failure.message === 'passkey_cancelled')) {
            error.set(this.describe?.(failure) ?? labels().error);
          }
        } finally {
          busy.set(false);
        }
      },
      setUpApp: () => {
        error.set(null);
        step.set('app');
      },
      appEnabled: () => finish(labels().appDone),
      back: () => step.set('choose'),
      answer: () => this.emit('answer', { done: step() === 'done' }),
      busy,
      error,
      describe: () => this.describe,
    };
    return useView(SecureAccountView)(logic);
  }
}

defineCustomElement('idp-secure-account', IdpSecureAccount);

declare global {
  interface HTMLElementTagNameMap {
    'idp-secure-account': IdpSecureAccount;
  }
  interface JSXCustomElements {
    'idp-secure-account': ElementAttributes<typeof props, SecureAccountEvents>;
  }
}
