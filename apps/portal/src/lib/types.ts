/** What the provider's developer API answers with. */
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
  created_at: string;
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
  environment: 'sandbox' | 'live';
  review_status: 'none' | 'pending' | 'approved' | 'rejected';
  review_note: string;
  redirect_uris: string[];
  post_logout_redirect_uris: string[];
  scopes: string[];
  grant_types: string[];
  homepage_url: string | null;
  privacy_url: string | null;
  terms_url: string | null;
  brand: { logo?: string; accent?: string };
  secrets: Secret[];
  created_at: string;
}

export interface ApiKey {
  id: string;
  name: string;
  environment: 'sandbox' | 'live';
  prefix: string;
  scopes: string[];
  created_at: string;
  last_used_at: string | null;
  active: boolean;
}

export interface OrganizationDetail {
  organization: Organization;
  apps: App[];
  keys: ApiKey[];
  test_users: { email: string; added_at: string }[];
}

export interface Home {
  me: Me | null;
  organizations: Organization[];
}
