/** What the provider's admin API answers with. */
export type { AdminOverview as Overview } from '@buntu/sdk/types';

/** An app as a reviewer sees it: the SDK's shape, shared with the console's elements. */
export type { ReviewRequest as Review } from '@buntu/sdk/types';

export type { AdminOrganization as OrganizationRow } from '@buntu/sdk/types';

export type { AdminUser as UserRow, AdminUserPage as UserPage, NewUser, UserEdit } from '@buntu/sdk/types';

export type { AdminClient as ClientRow, AdminMe as Me } from '@buntu/sdk/types';

export type { ScopeEntry as ScopeRow } from '@buntu/sdk/types';

export interface ProductRow {
  slug: string;
  names: { fr?: string; en?: string };
  descriptions: { fr?: string; en?: string };
  category: string;
  auth: ('oauth2' | 'oidc' | 'api_key' | 'webhooks')[];
  availability: 'ga' | 'beta' | 'sandbox';
  docs_url: string | null;
  position: number;
  approval: 'none' | 'review' | 'restricted';
  scopes: string[];
}

/** Why the console cannot be used yet, when it cannot: not signed in, no admin role, no second factor. */
export type Gate = 'signed_out' | 'not_admin' | 'mfa_required' | null;
