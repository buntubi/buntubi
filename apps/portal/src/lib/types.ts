/**
 * The developer API's answers come from @idp/sdk, shared with the elements; this file adds
 * only the shapes the portal itself assembles.
 */
import type { Me, Organization, OrganizationDetail, Product } from '@idp/sdk/types';

export type { ApiKey, App, AppOverview, Brand, Me, Member, Organization, OrganizationDetail, Product, Secret } from '@idp/sdk/types';

export interface Home {
  me: Me | null;
  organizations: Organization[];
}

/** What the workspace shell shows around a page. */
export interface Workspace {
  me: Me;
  organizations: Organization[];
  /** The API products, to name the ones an app uses. */
  products: Product[];
  /** The organization in the address, or null when it is not one of theirs. */
  current: OrganizationDetail | null;
}
