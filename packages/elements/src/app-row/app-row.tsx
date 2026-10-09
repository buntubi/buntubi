/** One app as a row of the list: its mark, name and ID, its status, the APIs it uses. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import type { AppStatus } from '../app-list/logic.js';
import { useView } from '../view.js';
import type { AppRowLogic } from './logic.js';
import { AppRowView } from './view.js';

const props = {
  name: prop.string(''),
  /** The line under the name: its ID and environment. */
  meta: prop.string(''),
  href: prop.string(''),
  status: prop.string('draft'),
  statusLabel: prop.string(''),
  apis: prop.object<string[]>([]),
};

export class IdpAppRow extends typedElement(props) {
  protected override render(): unknown {
    const logic: AppRowLogic = {
      name: () => this.name,
      mark: () => (this.name.trim()[0] ?? 'A').toUpperCase(),
      meta: () => this.meta,
      href: () => this.href,
      status: () => this.status as AppStatus,
      statusLabel: () => this.statusLabel,
      apis: () => this.apis.join(', '),
    };
    return useView(AppRowView)(logic);
  }
}

defineCustomElement('idp-app-row', IdpAppRow);

declare global {
  interface HTMLElementTagNameMap {
    'idp-app-row': IdpAppRow;
  }
  interface JSXCustomElements {
    'idp-app-row': ElementAttributes<typeof props>;
  }
}
