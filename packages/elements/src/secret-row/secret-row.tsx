/** One client secret: its prefix, when it was made and last used, when it ends, and revoking it. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { useView } from '../view.js';
import type { SecretRowEvents, SecretRowLogic } from './logic.js';
import { SecretRowView } from './view.js';

const props = {
  prefix: prop.string(''),
  created: prop.string(''),
  lastUsed: prop.string(''),
  expires: prop.string(''),
  revokeLabel: prop.string('Revoke'),
  canRevoke: prop.boolean(false),
  busy: prop.boolean(false),
};

export class IdpSecretRow extends typedElement(props) {
  protected override render(): unknown {
    const logic: SecretRowLogic = {
      prefix: () => this.prefix,
      created: () => this.created,
      lastUsed: () => this.lastUsed,
      expires: () => this.expires,
      revokeLabel: () => this.revokeLabel,
      canRevoke: () => this.canRevoke,
      busy: () => this.busy,
      revoke: () => this.emit('revoke', {}),
    };
    return useView(SecretRowView)(logic);
  }
}

defineCustomElement('idp-secret-row', IdpSecretRow);

declare global {
  interface HTMLElementTagNameMap {
    'idp-secret-row': IdpSecretRow;
  }
  interface JSXCustomElements {
    'idp-secret-row': ElementAttributes<typeof props, SecretRowEvents>;
  }
}
