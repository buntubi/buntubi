/** One app that uses the account. Removing its access goes through the injected `Account` service. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/start/di';
import { Account, type ConnectedApp } from '@buntu/sdk/account';
import { shortDate } from '../dates.js';
import { useView } from '../view.js';
import { connectedAppLabels, type ConnectedAppLabels, type ConnectedAppLogic } from './logic.js';
import { ConnectedAppView } from './view.js';

const props = {
  app: prop.object<ConnectedApp | null>(null),
  /** The platform's name, for its own apps. */
  brand: prop.string(''),
  locale: prop.string('en'),
  /** Words for the standard scopes (`profile`, `email`...); others use the platform's own. */
  scopeWords: prop.object<Record<string, string>>({}),
  labels: prop.object<Partial<ConnectedAppLabels>>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

export class IdpConnectedApp extends typedElement(props) {
  protected override render(): unknown {
    const account = inject(Account);
    const labels = () => ({ ...connectedAppLabels, ...this.labels });
    const confirming = signal(false);
    const busy = signal(false);
    const error = signal<string | null>(null);
    const logic: ConnectedAppLogic = {
      labels,
      name: () => this.app?.name ?? '',
      logo: () => this.app?.logo ?? '',
      initial: () => (this.app?.name ?? '?').trim().charAt(0).toUpperCase(),
      platform: () => (this.app?.platform ? labels().platform.replace('{brand}', this.brand) : ''),
      detail: () => {
        const a = this.app;
        const l = labels();
        if (!a) return '';
        const parts = [a.by];
        if (a.since) parts.push(l.since.replace('{date}', shortDate(a.since, this.locale)));
        parts.push(a.last_used_at ? l.lastUsed.replace('{date}', shortDate(a.last_used_at, this.locale)) : l.neverUsed);
        return parts.filter(Boolean).join(' · ');
      },
      scopes: () => (this.app?.scopes ?? []).map((s) => this.scopeWords[s.name] || s.description || s.name),
      confirming,
      toggle: () => {
        error.set(null);
        confirming.set(!confirming());
      },
      remove: async () => {
        const a = this.app;
        if (!a) return;
        busy.set(true);
        error.set(null);
        try {
          await account.removeApp(a.id);
        } catch (failure) {
          error.set(this.describe?.(failure) ?? labels().error);
        } finally {
          busy.set(false);
        }
      },
      busy,
      error,
    };
    return useView(ConnectedAppView)(logic);
  }
}

defineCustomElement('idp-connected-app', IdpConnectedApp);

declare global {
  interface HTMLElementTagNameMap {
    'idp-connected-app': IdpConnectedApp;
  }
  interface JSXCustomElements {
    'idp-connected-app': ElementAttributes<typeof props>;
  }
}
