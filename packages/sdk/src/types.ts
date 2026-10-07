/** What the provider's developer API answers with, as the portal and its elements see it. */

export type Role = 'owner' | 'admin' | 'developer' | 'reviewer' | 'viewer';
export type Environment = 'sandbox' | 'live';
export type AppKind = 'consumer' | 'business' | 'web' | 'mobile' | 'backend' | 'internal';
export type Platform = 'web' | 'ios' | 'android' | 'backend';
export type ReviewStatus = 'none' | 'pending' | 'approved' | 'rejected';
export type Stage = 'draft' | 'in_review' | 'changes_requested' | 'live';
export type Localized = { fr?: string; en?: string };

export interface Me {
  email: string;
  name: string;
  developer: boolean;
}

export interface Organization {
  id: string;
  name: string;
  description: string;
  support_email: string | null;
  suspended: boolean;
  role: Role;
  created_at: string;
}

export interface Member {
  id: string;
  email: string;
  name: string;
  role: Role;
  /** Client ids the member works on; empty for all. */
  apps: string[];
  added_at: string;
}

export interface Secret {
  id: string;
  prefix: string;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  active: boolean;
}

export interface App {
  client_id: string;
  organization_id: string;
  name: string;
  client_type: 'public' | 'confidential';
  environment: Environment;
  review_status: ReviewStatus;
  review_note: string;
  redirect_uris: string[];
  post_logout_redirect_uris: string[];
  scopes: string[];
  grant_types: string[];
  homepage_url: string | null;
  privacy_url: string | null;
  terms_url: string | null;
  brand: { logo?: string; accent?: string };
  kind: AppKind;
  description: string;
  category: string;
  platforms: Platform[];
  products: string[];
  disabled: boolean;
  secrets: Secret[];
  created_at: string;
}

export interface ApiKey {
  id: string;
  name: string;
  environment: Environment;
  prefix: string;
  scopes: string[];
  created_at: string;
  last_used_at: string | null;
  active: boolean;
}

export interface Check {
  key: 'basic_info' | 'redirect_uri' | 'products' | 'policies' | 'support_email' | 'permissions' | 'review';
  state: 'done' | 'warn' | 'todo';
  items: string[];
  required: boolean;
}

export interface AppOverview {
  stage: Stage;
  checks: Check[];
  scopes: { live: string[]; waiting: string[]; sandbox: string[] };
}

export interface Product {
  slug: string;
  names: Localized;
  descriptions: Localized;
  category: string;
  auth: ('oauth2' | 'oidc' | 'api_key' | 'webhooks')[];
  availability: 'ga' | 'beta' | 'sandbox';
  docs_url: string | null;
  approval: 'none' | 'review' | 'restricted';
  scopes: { name: string; sensitivity: 'public' | 'sensitive' | 'restricted'; descriptions: Localized }[];
}

export interface OrganizationDetail {
  organization: Organization;
  apps: App[];
  keys: ApiKey[];
  test_users: { email: string; added_at: string }[];
  members: Member[];
}

/** The platform's brand, from the provider's /.well-known/brand.json. */
export interface Brand {
  name?: string;
  accent?: string;
  logo?: string;
  support_email?: string;
  privacy_url?: string;
  terms_url?: string;
}
