/** One app waiting for a review: its name, its organization, what it asks for, the way in. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { useView } from '../view.js';
import type { WaitingAppLogic } from './logic.js';
import { WaitingAppView } from './view.js';

const props = {
  name: prop.string(''),
  organization: prop.string(''),
  scopes: prop.object<string[]>([]),
  href: prop.string(''),
  /** The link's words. */
  open: prop.string('Review'),
};

export class IdpWaitingApp extends typedElement(props) {
  protected override render(): unknown {
    const logic: WaitingAppLogic = {
      name: () => this.name,
      organization: () => this.organization,
      scopes: () => this.scopes,
      href: () => this.href,
      open: () => this.open,
    };
    return useView(WaitingAppView)(logic);
  }
}

defineCustomElement('idp-waiting-app', IdpWaitingApp);

declare global {
  interface HTMLElementTagNameMap {
    'idp-waiting-app': IdpWaitingApp;
  }
  interface JSXCustomElements {
    'idp-waiting-app': ElementAttributes<typeof props>;
  }
}
