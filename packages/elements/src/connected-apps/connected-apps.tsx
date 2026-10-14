/** The apps that use the person's account, one `idp-connected-app` each. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import type { ConnectedApp } from '@buntubi/sdk/account';
import { useView } from '../view.js';
import { connectedAppsLabels, type ConnectedAppsLabels, type ConnectedAppsLogic } from './logic.js';
import { ConnectedAppsView } from './view.js';
import '../connected-app/connected-app.js';

const props = {
  apps: prop.object<ConnectedApp[]>([]),
  brand: prop.string(''),
  locale: prop.string('en'),
  scopeWords: prop.object<Record<string, string>>({}),
  labels: prop.object<Partial<ConnectedAppsLabels>>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

export class IdpConnectedApps extends typedElement(props) {
  protected override render(): unknown {
    const labels = () => ({ ...connectedAppsLabels, ...this.labels });
    const logic: ConnectedAppsLogic = {
      labels,
      apps: () => this.apps,
      brand: () => this.brand,
      locale: () => this.locale,
      scopeWords: () => this.scopeWords,
      describe: () => this.describe,
      note: () => (this.apps.some((a) => a.platform) ? labels().platformNote.replaceAll('{brand}', this.brand) : ''),
    };
    return useView(ConnectedAppsView)(logic);
  }
}

defineCustomElement('idp-connected-apps', IdpConnectedApps);

declare global {
  interface HTMLElementTagNameMap {
    'idp-connected-apps': IdpConnectedApps;
  }
  interface JSXCustomElements {
    'idp-connected-apps': ElementAttributes<typeof props>;
  }
}
