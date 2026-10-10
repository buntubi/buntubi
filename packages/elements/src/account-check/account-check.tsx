/** The account check as a card, one `idp-account-check-item` per line. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import '../account-check-item/account-check-item.js';
import { useView } from '../view.js';
import type { AccountCheckLogic } from './logic.js';
import { AccountCheckView } from './view.js';
import { accountCheckLabels, type AccountCheck, type AccountCheckLabels } from './logic.js';

const props = {
  checks: prop.object<AccountCheck[]>([]),
  labels: prop.object<Partial<AccountCheckLabels>>({}),
};

export class IdpAccountCheck extends typedElement(props) {
  protected override render(): unknown {
    const logic: AccountCheckLogic = {
      labels: () => ({ ...accountCheckLabels, ...this.labels }),
      checks: () => this.checks,
      done: () => this.checks.filter((check) => check.tone === 'ok').length,
      percent: () => (this.checks.length ? Math.round((100 * this.checks.filter((c) => c.tone === 'ok').length) / this.checks.length) : 100),
    };
    return useView(AccountCheckView)(logic);
  }
}

defineCustomElement('idp-account-check', IdpAccountCheck);

declare global {
  interface HTMLElementTagNameMap {
    'idp-account-check': IdpAccountCheck;
  }
  interface JSXCustomElements {
    'idp-account-check': ElementAttributes<typeof props>;
  }
}
