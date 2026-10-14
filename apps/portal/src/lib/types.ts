/**
 * The developer API's answers come from @buntubi/sdk, shared with the elements; this file adds
 * only the shapes the portal itself assembles.
 */
import type { App, AppOverview, Me, Organization, OrganizationDetail, Product, Role } from '@buntubi/sdk/types';

export type {
  ApiKey,
  App,
  AppOverview,
  AppReview,
  Brand,
  Me,
  Invitation,
  Member,
  Organization,
  OrganizationDetail,
  Product,
  Role,
  Secret,
} from '@buntubi/sdk/types';

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
  /** The plugins the provider runs, by id: their pages show in the sidebar. */
  plugins: string[];
}

/** One app's workspace: null throughout when the address names an app the reader cannot see. */
export interface AppWorkspace {
  /** The provider's address, for its published key set. */
  issuer: string;
  app: App | null;
  role: Role | null;
  overview: AppOverview | null;
}
