/** What the provider's developer API answers with, as the portal and its elements see it. */

export type Role = 'owner' | 'manager' | 'developer' | 'reviewer' | 'viewer';
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
  /** The platform's own organization: its members are the admins. */
  platform: boolean;
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
  /** Whether the account signs in with a second factor. */
  two_step: boolean;
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
  /** Skips the consent screen; set in the owner console, on the platform's own apps. */
  first_party: boolean;
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

/** The platform at a glance, for its owner. */
export interface AdminOverview {
  users: number;
  developers: number;
  organizations: number;
  suspended_organizations: number;
  live_apps: number;
  sandbox_apps: number;
  pending_reviews: number;
}

/** An organization as the platform owner sees it. */
export interface AdminOrganization {
  id: string;
  name: string;
  owner: { id: string; email: string } | null;
  members: number;
  support_email: string | null;
  approved_scopes: string[];
  apps: number;
  /** The platform's own organization: its members are the admins. */
  platform: boolean;
  suspended: boolean;
  suspended_reason: string | null;
  created_at: string;
}

/** An app as the platform owner sees it, whoever's it is. */
export interface AdminClient {
  client_id: string;
  name: string;
  client_type: 'public' | 'confidential';
  redirect_uris: string[];
  scope: string;
  /** Signs people in without a consent screen; only a platform app may. */
  first_party: boolean;
  homepage_url: string | null;
  disabled: boolean;
  organization_id: string | null;
  organization: string | null;
  /** One of the platform's own apps: in the platform organization. */
  platform: boolean;
  environment: 'sandbox' | 'live';
  review_status: string;
  created_at: string;
}

/** Who is signed in to the console. */
export interface AdminMe {
  id: string;
  email: string;
  name: string;
  superadmin: boolean;
  /** Where the platform's own apps live; null before `flask platform setup`. */
  platform_organization_id: string | null;
}

/** An account as the platform owner sees it. */
export interface AdminUser {
  id: string;
  email: string;
  email_verified: boolean;
  given_name: string;
  family_name: string;
  roles: string[];
  /** Made from the command line; manages the admins, and the console cannot demote or disable it. */
  superadmin: boolean;
  developer: boolean;
  mfa: boolean;
  disabled: boolean;
  created_at: string;
}

export type Sensitivity = 'public' | 'sensitive' | 'restricted';

/** A scope in the platform's catalogue. */
export interface ScopeEntry {
  name: string;
  sensitivity: Sensitivity;
  descriptions: Localized;
  resource: string;
  notes: string;
  product?: string | null;
}

/** One request to go live with sensitive scopes, and the platform owner's answer. */
export interface AppReview {
  id: string;
  submitted_at: string;
  submitted_by: { name: string; email: string } | null;
  /** The sensitive scopes it asked for. */
  scopes: string[];
  /** Why each scope is needed and where people meet it. */
  justifications: Record<string, string>;
  /** How a reviewer can try the app. */
  instructions: string;
  decision: 'pending' | 'approved' | 'rejected';
  note: string;
  decided_at: string | null;
  /** For the platform's staff only. */
  decided_by?: { name: string; email: string } | null;
}

/** An app as a reviewer sees it: what it is, who answers for it, and its reviews. */
export interface ReviewRequest {
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
  description: string;
  logo: string | null;
  review_status: ReviewStatus;
  /** The latest first; the first is the open one while the app waits. */
  history: AppReview[];
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
