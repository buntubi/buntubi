/** Where the person is signed in, one `idp-device` each. Signs out the others through `Account`. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/start/di';
import { Account, type Device } from '@buntu/sdk/account';
import { useView } from '../view.js';
import { devicesLabels, type DevicesLabels, type DevicesLogic } from './logic.js';
import { DevicesView } from './view.js';
import '../device/device.js';

const props = {
  devices: prop.object<Device[]>([]),
  locale: prop.string('en'),
  labels: prop.object<Partial<DevicesLabels>>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

export class IdpDevices extends typedElement(props) {
  protected override render(): unknown {
    const account = inject(Account);
    const labels = () => ({ ...devicesLabels, ...this.labels });
    const busy = signal(false);
    const error = signal<string | null>(null);
    const logic: DevicesLogic = {
      labels,
      devices: () => this.devices,
      summary: () => {
        const l = labels();
        const n = this.devices.length;
        const idle = this.devices.filter((d) => d.inactive).length;
        const count = n === 1 ? l.countOne : l.count.replace('{n}', String(n));
        return idle ? `${count} · ${l.inactive.replace('{n}', String(idle))}` : count;
      },
      others: () => this.devices.some((d) => !d.here),
      locale: () => this.locale,
      describe: () => this.describe,
      signOutOthers: async () => {
        busy.set(true);
        error.set(null);
        try {
          await account.signOutOtherDevices();
        } catch (failure) {
          error.set(this.describe?.(failure) ?? labels().error);
        } finally {
          busy.set(false);
        }
      },
      busy,
      error,
    };
    return useView(DevicesView)(logic);
  }
}

defineCustomElement('idp-devices', IdpDevices);

declare global {
  interface HTMLElementTagNameMap {
    'idp-devices': IdpDevices;
  }
  interface JSXCustomElements {
    'idp-devices': ElementAttributes<typeof props>;
  }
}
