/**
 * Connecting a device (a TV, a terminal) with the code it shows. The user types or confirms the
 * code, then allows or refuses; `success` carries the answer and the action's result.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { signal } from '@fluixi/reactive/signal';
import { PinInput } from '@fluixi-ui/pin-input';
import { Button } from '@fluixi-ui/button';
import { useElementAction, type ElementAction } from '../shared/element-action.js';
import { messageReader, type Messages } from '../shared/messages.js';
import '../shared/form.css';

export interface DeviceDecision {
  userCode: string;
  approve: boolean;
}

export interface DeviceActivateLabels {
  intro: string;
  code: string;
  approve: string;
  deny: string;
  pending: string;
}

export const deviceActivateLabels: DeviceActivateLabels = {
  intro: 'Enter the code shown on your device. Only allow a device you are using right now.',
  code: 'Device code',
  approve: 'Allow',
  deny: 'Refuse',
  pending: 'One moment',
};

export interface DeviceActivateEvents {
  decide: DeviceDecision;
  success: { approve: boolean; result: unknown };
}

const CODE_LENGTH = 8;

const props = {
  /** A code already known (from the link the device showed); the user still confirms it. */
  userCode: prop.string(''),
  action: prop.any<ElementAction<DeviceDecision> | undefined>(undefined),
  labels: prop.object<DeviceActivateLabels>(deviceActivateLabels),
  messages: prop.object<Messages>({}),
};

const clean = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);

export class IdpDeviceActivate extends typedElement(props) {
  protected override render(): unknown {
    const label = () => ({ ...deviceActivateLabels, ...this.labels });
    const text = messageReader(() => this.messages);
    const code = signal(clean(this.userCode));
    const invalid = signal(false);
    const { run, pending, error } = useElementAction('idp-device-activate', () => this.action, text);

    const decide = (approve: boolean) => {
      if (code().length !== CODE_LENGTH) {
        invalid.set(true);
        return;
      }
      invalid.set(false);
      const decision = { userCode: code(), approve };
      this.emit('decide', decision);
      if (!this.action) return;
      run(decision).then(
        (result) => this.emit('success', { approve, result }),
        () => {},
      );
    };

    const problem = () => (invalid() ? text('form.userCode') : error());

    return (
      <div class="idp-form">
        <p class="idp-note">{() => label().intro}</p>
        {() => (problem() ? <p class="idp-alert" role="alert">{problem()}</p> : null)}
        <PinInput
          class="idp-code"
          type="alphanumeric"
          length={CODE_LENGTH}
          aria-label={() => label().code}
          value={code()}
          onValueChange={(value: string) => code.set(clean(value))}
        />
        <div class="idp-actions">
          <Button type="button" variant="outline" disabled={pending()} onPress={() => decide(false)}>
            {() => label().deny}
          </Button>
          <Button type="button" variant="solid" disabled={pending()} onPress={() => decide(true)}>
            {() => (pending() ? label().pending : label().approve)}
          </Button>
        </div>
      </div>
    );
  }
}

defineCustomElement('idp-device-activate', IdpDeviceActivate);

declare global {
  interface HTMLElementTagNameMap {
    'idp-device-activate': IdpDeviceActivate;
  }
  interface JSXCustomElements {
    'idp-device-activate': ElementAttributes<typeof props, DeviceActivateEvents>;
  }
}
