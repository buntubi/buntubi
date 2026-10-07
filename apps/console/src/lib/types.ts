/** What the provider's admin API answers with. */
export interface Overview {
  users: number;
  developers: number;
  organizations: number;
  suspended_organizations: number;
  live_apps: number;
  sandbox_apps: number;
  pending_reviews: number;
}

export interface Review {
  client_id: string;
  name: string;
  client_type: string;
  scope: string;
  sensitive_scopes: string[];
  homepage_url: string | null;
  privacy_url: string | null;
  terms_url: string | null;
  brand: { logo?: string };
  redirect_uris: string[];
  organization: { id: string; name: string; support_email: string | null } | null;
  owner: { email: string; name: string } | null;
  requested_at: string;
}

export interface OrganizationRow {
  id: string;
  name: string;
  owner: { id: string; email: string } | null;
  members: number;
  support_email: string | null;
  approved_scopes: string[];
  apps: number;
  suspended: boolean;
  suspended_reason: string | null;
  created_at: string;
}

export interface UserRow {
  id: string;
  email: string;
  email_verified: boolean;
  given_name: string;
  family_name: string;
  roles: string[];
  developer: boolean;
  mfa: boolean;
  disabled: boolean;
  created_at: string;
}

export interface ScopeRow {
  name: string;
  sensitivity: 'public' | 'sensitive' | 'restricted';
  descriptions: { fr?: string; en?: string };
  resource: string;
  notes: string;
  product?: string | null;
}

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
