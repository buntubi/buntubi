/** One area of the account (personal info, security...) as a card that opens its page. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { useView } from '../view.js';
import type { AccountAreaLogic } from './logic.js';
import { AccountAreaView } from './view.js';

const props = {
  title: prop.string(''),
  note: prop.string(''),
  /** The words of the way in: "Review security". */
  link: prop.string(''),
  href: prop.string(''),
  icon: prop.string(''),
};

export class IdpAccountArea extends typedElement(props) {
  protected override render(): unknown {
    const logic: AccountAreaLogic = {
      title: () => this.title,
      note: () => this.note,
      link: () => this.link,
      href: () => this.href,
      icon: () => this.icon,
    };
    return useView(AccountAreaView)(logic);
  }
}

defineCustomElement('idp-account-area', IdpAccountArea);

declare global {
  interface HTMLElementTagNameMap {
    'idp-account-area': IdpAccountArea;
  }
  interface JSXCustomElements {
    'idp-account-area': ElementAttributes<typeof props>;
  }
}
