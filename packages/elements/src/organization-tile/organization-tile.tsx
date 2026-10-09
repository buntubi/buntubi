/** One organization as a tile that opens its workspace. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { useView } from '../view.js';
import type { OrganizationTileLogic } from './logic.js';
import { OrganizationTileView } from './view.js';

const props = {
  name: prop.string(''),
  /** A second line: the support address, usually. */
  detail: prop.string(''),
  href: prop.string(''),
};

export class IdpOrganizationTile extends typedElement(props) {
  protected override render(): unknown {
    const logic: OrganizationTileLogic = {
      name: () => this.name,
      detail: () => this.detail,
      href: () => this.href,
      choose: () => this.emit('choose', {}),
    };
    return useView(OrganizationTileView)(logic);
  }
}

defineCustomElement('idp-organization-tile', IdpOrganizationTile);

declare global {
  interface HTMLElementTagNameMap {
    'idp-organization-tile': IdpOrganizationTile;
  }
  interface JSXCustomElements {
    'idp-organization-tile': ElementAttributes<typeof props, { choose: Record<string, never> }>;
  }
}
