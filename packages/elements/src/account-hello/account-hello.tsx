/** The person signed in: avatar, greeting, address and when they joined. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { initials } from '../initials.js';
import { useView } from '../view.js';
import type { AccountHelloLogic } from './logic.js';
import { AccountHelloView } from './view.js';
import { accountHelloLabels, type AccountHelloLabels } from './logic.js';

const props = {
  name: prop.string(''),
  firstName: prop.string(''),
  email: prop.string(''),
  /** The photo's address; empty: the initials. */
  picture: prop.string(''),
  /** When the account was made, ISO; shown as a date in `locale`. */
  createdAt: prop.string(''),
  locale: prop.string('en'),
  /** Where the personal info page is; empty: no link. */
  editHref: prop.string(''),
  labels: prop.object<Partial<AccountHelloLabels>>({}),
};

export class IdpAccountHello extends typedElement(props) {
  protected override render(): unknown {
    const logic: AccountHelloLogic = {
      labels: () => ({ ...accountHelloLabels, ...this.labels }),
      name: () => this.name,
      firstName: () => this.firstName || this.name || this.email,
      email: () => this.email,
      since: () => (this.createdAt ? new Intl.DateTimeFormat(this.locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(this.createdAt)) : ''),
      initials: () => initials(this.name || this.email),
      picture: () => this.picture,
      editHref: () => this.editHref,
    };
    return useView(AccountHelloView)(logic);
  }
}

defineCustomElement('idp-account-hello', IdpAccountHello);

declare global {
  interface HTMLElementTagNameMap {
    'idp-account-hello': IdpAccountHello;
  }
  interface JSXCustomElements {
    'idp-account-hello': ElementAttributes<typeof props>;
  }
}
