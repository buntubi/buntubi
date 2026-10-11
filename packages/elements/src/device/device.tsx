/** One signed-in browser or phone. Signing it out goes through the injected `Account` service. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/start/di';
import { Account, type Device } from '@idp/sdk/account';
import { shortDate } from '../dates.js';
import { useView } from '../view.js';
import { deviceLabels, type DeviceLabels, type DeviceLogic } from './logic.js';
import { DeviceView } from './view.js';

const props = {
  device: prop.object<Device | null>(null),
  locale: prop.string('en'),
  labels: prop.object<Partial<DeviceLabels>>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

/** How it signed in, from its amr values. */
const methodOf = (methods: string[], l: DeviceLabels) =>
  methods.includes('hwk')
    ? l.methods.passkey
    : methods.includes('backup')
      ? l.methods.backup
      : methods.includes('mfa')
        ? l.methods.twoStep
        : l.methods.password;

export class IdpDevice extends typedElement(props) {
  protected override render(): unknown {
    const account = inject(Account);
    const labels = () => ({ ...deviceLabels, ...this.labels, methods: { ...deviceLabels.methods, ...this.labels.methods } });
    const busy = signal(false);
    const error = signal<string | null>(null);
    const logic: DeviceLogic = {
      labels,
      name: () => {
        const d = this.device;
        const l = labels();
        if (!d) return '';
        return d.browser && d.system ? l.name.replace('{browser}', d.browser).replace('{system}', d.system) : d.browser || d.system || l.unknown;
      },
      phone: () => ['iPhone', 'Android'].includes(this.device?.system ?? ''),
      here: () => this.device?.here === true,
      network: () => (this.device?.ip ? labels().network.replace('{ip}', this.device.ip) : ''),
      seen: () => {
        const d = this.device;
        const l = labels();
        if (!d) return '';
        const when = d.active_now ? l.activeNow : l.lastSeen.replace('{date}', shortDate(d.last_seen_at, this.locale));
        return `${when} · ${l.signedInWith.replace('{method}', methodOf(d.methods, l))}`;
      },
      signOut: async () => {
        const d = this.device;
        if (!d) return;
        busy.set(true);
        error.set(null);
        try {
          await account.signOutDevice(d.id);
        } catch (failure) {
          error.set(this.describe?.(failure) ?? labels().error);
        } finally {
          busy.set(false);
        }
      },
      busy,
      error,
    };
    return useView(DeviceView)(logic);
  }
}

defineCustomElement('idp-device', IdpDevice);

declare global {
  interface HTMLElementTagNameMap {
    'idp-device': IdpDevice;
  }
  interface JSXCustomElements {
    'idp-device': ElementAttributes<typeof props>;
  }
}
