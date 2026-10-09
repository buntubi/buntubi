/** A developer's organizations, one tile each; apart from the look. */
import type { Organization } from '@idp/sdk/types';

export interface OrganizationTilesLogic {
  title: () => string;
  empty: () => string;
  organizations: () => Organization[];
  hrefOf: (organization: Organization) => string;
}
