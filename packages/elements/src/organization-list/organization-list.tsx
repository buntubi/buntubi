/** Every organization as a table, one `idp-organization-row` each, in a card. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import type { AdminOrganization } from '@idp/sdk/types';
import '../organization-row/organization-row.js';
import type { OrganizationRowLabels } from '../organization-row/logic.js';
import { useView } from '../view.js';
import { organizationListLabels, type OrganizationListLabels, type OrganizationListLogic } from './logic.js';
import { OrganizationListView } from './view.js';

const props = {
  organizations: prop.object<AdminOrganization[]>([]),
  labels: prop.object<Partial<OrganizationListLabels>>({}),
  /** Handed to every row. */
  rowLabels: prop.object<Partial<OrganizationRowLabels>>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
  /** Handed to every row: an organization's apps, `{name}` replaced. */
  appsHref: prop.string('/apps?q={name}'),
  /** Text for validation keys, handed to every row; see messages.ts. */
  messages: prop.object<Record<string, string>>({}),
};

export class IdpOrganizationList extends typedElement(props) {
  protected override render(): unknown {
    const logic: OrganizationListLogic = {
      labels: () => ({ ...organizationListLabels, ...this.labels }),
      organizations: () => this.organizations,
      rowLabels: () => this.rowLabels,
      describe: () => this.describe,
      appsHref: () => this.appsHref,
      messages: () => this.messages,
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
