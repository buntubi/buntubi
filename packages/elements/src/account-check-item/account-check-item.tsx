/** One line of the account check, with the way to fix it when it needs fixing. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { useView } from '../view.js';
import type { AccountCheckItemLogic } from './logic.js';
import { AccountCheckItemView } from './view.js';

const props = {
  title: prop.string(''),
  note: prop.string(''),
  /** `ok` done, `warn` to do, `info` a suggestion. */
  tone: prop.string('ok'),
  /** The fix's label and page; empty: nothing to do. */
  action: prop.string(''),
  href: prop.string(''),
};

export class IdpAccountCheckItem extends typedElement(props) {
  protected override render(): unknown {
    const logic: AccountCheckItemLogic = {
      title: () => this.title,
      note: () => this.note,
      tone: () => (this.tone === 'warn' || this.tone === 'info' ? this.tone : 'ok'),
      action: () => this.action,
      href: () => this.href,
    };
    return useView(AccountCheckItemView)(logic);
  }
}

defineCustomElement('idp-account-check-item', IdpAccountCheckItem);

declare global {
  interface HTMLElementTagNameMap {
    'idp-account-check-item': IdpAccountCheckItem;
  }
  interface JSXCustomElements {
    'idp-account-check-item': ElementAttributes<typeof props>;
  }
}
