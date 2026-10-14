/** A developer's organizations, one tile each; apart from the look. */
import type { Organization } from '@buntubi/sdk/types';

export interface OrganizationTilesLogic {
  title: () => string;
  empty: () => string;
  platform: () => string;
  organizations: () => Organization[];
  hrefOf: (organization: Organization) => string;
  choose: (id: string) => void;
}
