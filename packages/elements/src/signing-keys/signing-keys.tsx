/** The provider's signing keys: how tokens are signed and the address of the key set. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { useView } from '../view.js';
import { signingKeysLabels, type SigningKeysLabels, type SigningKeysLogic } from './logic.js';
import { SigningKeysView } from './view.js';

const props = {
  jwksUrl: prop.string(''),
  labels: prop.object<Partial<SigningKeysLabels>>({}),
};

export class IdpSigningKeys extends typedElement(props) {
  protected override render(): unknown {
    const logic: SigningKeysLogic = { labels: () => ({ ...signingKeysLabels, ...this.labels }), jwksUrl: () => this.jwksUrl };
    return useView(SigningKeysView)(logic);
  }
}

defineCustomElement('idp-signing-keys', IdpSigningKeys);

declare global {
  interface HTMLElementTagNameMap {
    'idp-signing-keys': IdpSigningKeys;
  }
  interface JSXCustomElements {
    'idp-signing-keys': ElementAttributes<typeof props>;
  }
}
