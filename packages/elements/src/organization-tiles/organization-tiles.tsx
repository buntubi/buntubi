/** A developer's organizations under a heading, one `idp-organization-tile` each. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import type { Organization } from '@idp/sdk/types';
import '../organization-tile/organization-tile.js';
import { useView } from '../view.js';
import type { OrganizationTilesLogic } from './logic.js';
import { OrganizationTilesView } from './view.js';

const props = {
  organizations: prop.object<Organization[]>([]),
  title: prop.string('Organizations'),
  empty: prop.string('No organization yet.'),
  /** The mark on the platform's own organization. */
  platform: prop.string('Platform'),
  /** Where one organization opens; `{id}` is replaced. */
  href: prop.string('/o/{id}'),
};

export class IdpOrganizationTiles extends typedElement(props) {
  protected override render(): unknown {
    const logic: OrganizationTilesLogic = {
      title: () => this.title,
      empty: () => this.empty,
      platform: () => this.platform,
      organizations: () => this.organizations,
      hrefOf: (organization) => this.href.replace('{id}', encodeURIComponent(organization.id)),
      choose: (id) => this.emit('choose', { id }),
    };
    return useView(OrganizationTilesView)(logic);
  }
}

defineCustomElement('idp-organization-tiles', IdpOrganizationTiles);

declare global {
  interface HTMLElementTagNameMap {
    'idp-organization-tiles': IdpOrganizationTiles;
  }
  interface JSXCustomElements {
    'idp-organization-tiles': ElementAttributes<typeof props, { choose: { id: string } }>;
  }
}
