/** Every organization, one `idp-organization-card` each. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import type { AdminOrganization } from '@idp/sdk/types';
import '../organization-card/organization-card.js';
import type { OrganizationCardLabels } from '../organization-card/logic.js';
import { useView } from '../view.js';
import type { OrganizationListLogic } from './logic.js';
import { OrganizationListView } from './view.js';

const props = {
  organizations: prop.object<AdminOrganization[]>([]),
  /** Shown when there is none. */
  empty: prop.string('No organization.'),
  /** Handed to every card. */
  cardLabels: prop.object<Partial<OrganizationCardLabels>>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

export class IdpOrganizationList extends typedElement(props) {
  protected override render(): unknown {
    const logic: OrganizationListLogic = {
      organizations: () => this.organizations,
      empty: () => this.empty,
      cardLabels: () => this.cardLabels,
      describe: () => this.describe,
    };
    return useView(OrganizationListView)(logic);
  }
}

defineCustomElement('idp-organization-list', IdpOrganizationList);

declare global {
  interface HTMLElementTagNameMap {
    'idp-organization-list': IdpOrganizationList;
  }
  interface JSXCustomElements {
    'idp-organization-list': ElementAttributes<typeof props>;
  }
}
