/** One way to protect the account: its icon, name and why, and the button that sets it up. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { useView } from '../view.js';
import type { SecureOptionEvents, SecureOptionLogic } from './logic.js';
import { SecureOptionView } from './view.js';

const props = {
  title: prop.string(''),
  text: prop.string(''),
  icon: prop.string(''),
  badge: prop.string(''),
  action: prop.string(''),
  busy: prop.boolean(false),
};

export class IdpSecureOption extends typedElement(props) {
  protected override render(): unknown {
    const logic: SecureOptionLogic = {
      title: () => this.title,
      text: () => this.text,
      icon: () => this.icon,
      badge: () => this.badge,
      action: () => this.action,
      busy: () => this.busy,
      choose: () => this.emit('choose', {}),
    };
    return useView(SecureOptionView)(logic);
  }
}

defineCustomElement('idp-secure-option', IdpSecureOption);

declare global {
  interface HTMLElementTagNameMap {
    'idp-secure-option': IdpSecureOption;
  }
  interface JSXCustomElements {
    'idp-secure-option': ElementAttributes<typeof props, SecureOptionEvents>;
  }
}
