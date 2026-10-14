/**
 * Connecting a device (a TV, a terminal) with the code it shows. The user types or confirms the
 * code, then allows or refuses; `success` carries the answer and the action's result.
 */
import { useView } from '@buntubi/sdk/view';
import { DeviceActivateView } from './view.js';
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { signal } from '@fluixi/reactive/signal';
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

export const CODE_LENGTH = 8;

const props = {
  /** A code already known (from the link the device showed); the user still confirms it. */
  userCode: prop.string(''),
  action: prop.any<ElementAction<DeviceDecision> | undefined>(undefined),
  labels: prop.object<DeviceActivateLabels>(deviceActivateLabels),
  messages: prop.object<Messages>({}),
};

export const clean = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);

export class IdpDeviceActivate extends typedElement(props) {
  /** What the view draws from; a deployment can give its own view (UI plugin `views`). */
  logic() {
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

    return {
      code,
      decide,
      label,
      pending,
      problem,
    };
  }

  protected override render(): unknown {
    return useView(DeviceActivateView)(this.logic());
  }
}

export type DeviceActivateLogic = ReturnType<IdpDeviceActivate['logic']>;

defineCustomElement('idp-device-activate', IdpDeviceActivate);

declare global {
  interface HTMLElementTagNameMap {
    'idp-device-activate': IdpDeviceActivate;
  }
  interface JSXCustomElements {
    'idp-device-activate': ElementAttributes<typeof props, DeviceActivateEvents>;
  }
}
