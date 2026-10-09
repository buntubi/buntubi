/** A value shown this once (a new secret or key), what that means, and a copy button. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { copier } from '../copy.js';
import { useView } from '../view.js';
import type { OneTimeValueLogic } from './logic.js';
import { OneTimeValueView } from './view.js';

const props = {
  value: prop.string(''),
  note: prop.string('Copy this now: it will not be shown again.'),
  copyLabel: prop.string('Copy'),
  copiedLabel: prop.string('Copied'),
};

export class IdpOneTimeValue extends typedElement(props) {
  protected override render(): unknown {
    const clip = copier();
    const logic: OneTimeValueLogic = {
      value: () => this.value,
      note: () => this.note,
      copyLabel: () => (clip.copied() ? this.copiedLabel : this.copyLabel),
      copied: clip.copied,
      copy: () => clip.copy(this.value),
    };
    return useView(OneTimeValueView)(logic);
  }
}

defineCustomElement('idp-one-time-value', IdpOneTimeValue);

declare global {
  interface HTMLElementTagNameMap {
    'idp-one-time-value': IdpOneTimeValue;
  }
  interface JSXCustomElements {
    'idp-one-time-value': ElementAttributes<typeof props>;
  }
}
