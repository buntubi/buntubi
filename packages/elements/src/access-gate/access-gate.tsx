/** Shown instead of an app that is closed to the visitor: why, and the ways out. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { useView } from '../view.js';
import { accessGateLabels, type AccessGateLabels, type AccessGateLogic, type GateReason, type AccessGateEvents } from './logic.js';
import { AccessGateView } from './view.js';

const props = {
  reason: prop.string('signed_out'),
  /** Where the account's two-step sign-in is set up. */
  accountHref: prop.string(''),
  signOutHref: prop.string('/auth/logout'),
  labels: prop.object<Partial<AccessGateLabels>>({}),
};

export class IdpAccessGate extends typedElement(props) {
  protected override render(): unknown {
    const logic: AccessGateLogic = {
      labels: () => ({ ...accessGateLabels, ...this.labels }),
      reason: () => this.reason as GateReason,
      accountHref: () => this.accountHref,
      signOutHref: () => this.signOutHref,
      signIn: () => this.emit('signin', {}),
    };
    return useView(AccessGateView)(logic);
  }
}

defineCustomElement('idp-access-gate', IdpAccessGate);

declare global {
  interface HTMLElementTagNameMap {
    'idp-access-gate': IdpAccessGate;
  }
  interface JSXCustomElements {
    'idp-access-gate': ElementAttributes<typeof props, AccessGateEvents>;
  }
}
