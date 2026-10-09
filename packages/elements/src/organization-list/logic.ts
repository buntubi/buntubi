/** The organizations, one card each; apart from the look. */
import type { AdminOrganization } from '@idp/sdk/types';
import type { OrganizationCardLabels } from '../organization-card/logic.js';

export interface OrganizationListLogic {
  organizations: () => AdminOrganization[];
  empty: () => string;
  cardLabels: () => Partial<OrganizationCardLabels>;
  describe: () => ((error: unknown) => string) | undefined;
}
