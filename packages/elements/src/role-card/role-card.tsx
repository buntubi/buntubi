/** One role and what it may do. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { useView } from '../view.js';
import type { RoleCardLogic } from './logic.js';
import { RoleCardView } from './view.js';

const props = {
  name: prop.string(''),
  text: prop.string(''),
};

export class IdpRoleCard extends typedElement(props) {
  protected override render(): unknown {
    const logic: RoleCardLogic = { name: () => this.name, text: () => this.text };
    return useView(RoleCardView)(logic);
  }
}

defineCustomElement('idp-role-card', IdpRoleCard);

declare global {
  interface HTMLElementTagNameMap {
    'idp-role-card': IdpRoleCard;
  }
  interface JSXCustomElements {
    'idp-role-card': ElementAttributes<typeof props>;
  }
}
