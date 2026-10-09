/** One API key: its name, what it may call and when it was made, its prefix, and revoking it. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { useView } from '../view.js';
import type { KeyRowEvents, KeyRowLogic } from './logic.js';
import { KeyRowView } from './view.js';

const props = {
  name: prop.string(''),
  /** "All sandbox scopes · created Oct 6". */
  meta: prop.string(''),
  prefix: prop.string(''),
  revokeLabel: prop.string('Revoke'),
  canRevoke: prop.boolean(false),
  busy: prop.boolean(false),
};

export class IdpKeyRow extends typedElement(props) {
  protected override render(): unknown {
    const logic: KeyRowLogic = {
      name: () => this.name,
      meta: () => this.meta,
      prefix: () => this.prefix,
      revokeLabel: () => this.revokeLabel,
      canRevoke: () => this.canRevoke,
      busy: () => this.busy,
      revoke: () => this.emit('revoke', {}),
    };
    return useView(KeyRowView)(logic);
  }
}

defineCustomElement('idp-key-row', IdpKeyRow);

declare global {
  interface HTMLElementTagNameMap {
    'idp-key-row': IdpKeyRow;
  }
  interface JSXCustomElements {
    'idp-key-row': ElementAttributes<typeof props, KeyRowEvents>;
  }
}
