/** The organizations as a table, one row each; apart from the look. */
import type { AdminOrganization } from '@buntubi/sdk/types';
import type { OrganizationRowLabels } from '../organization-row/logic.js';

export interface OrganizationListLabels {
  /** What the table is, for assistive technology. */
  title: string;
  organization: string;
  owner: string;
  members: string;
  apps: string;
  approved: string;
  status: string;
  empty: string;
}

export const organizationListLabels: OrganizationListLabels = {
  title: 'Organizations',
  organization: 'Organization',
  owner: 'Owner',
  members: 'Members',
  apps: 'Apps',
  approved: 'Approved scopes',
  status: 'Status',
  empty: 'No organization.',
};

export interface OrganizationListLogic {
  labels: () => OrganizationListLabels;
  organizations: () => AdminOrganization[];
  rowLabels: () => Partial<OrganizationRowLabels>;
  describe: () => ((error: unknown) => string) | undefined;
  appsHref: () => string;
  messages: () => Record<string, string>;
}
