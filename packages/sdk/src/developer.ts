/**
 * What elements may ask of the developer API. The token has no default: the app provides the
 * implementation in its module (the portal maps it to its server functions), so an element
 * never knows where the calls go.
 */
import { injectionToken } from '@fluixi/di';
import type { ApiKey, App, AppKind, Invitation, Member, Organization, Platform, Role } from './types.js';

export interface NewApp {
  name: string;
  client_type: 'public' | 'confidential';
  kind: AppKind;
  description?: string;
  category?: string;
  platforms?: Platform[];
  products?: string[];
  redirect_uris?: string[];
  homepage_url?: string;
  privacy_url?: string;
  terms_url?: string;
  grant_types?: string[];
  brand?: { logo?: string };
}

/** A change to an app: a link set to null is removed. */
export type AppPatch = Partial<Omit<NewApp, 'homepage_url' | 'privacy_url' | 'terms_url' | 'brand' | 'grant_types'>> & {
  scopes?: string[];
  homepage_url?: string | null;
  privacy_url?: string | null;
  terms_url?: string | null;
  brand?: { logo?: string | null; accent?: string };
};

export interface DeveloperService {
  /** Makes the account a developer: the terms, accepted once. */
  acceptTerms(): Promise<void>;
  createOrganization(input: { name: string; support_email?: string }): Promise<Organization>;
  updateOrganization(input: {
    organization: string;
    patch: { name?: string; description?: string; support_email?: string | null };
  }): Promise<Organization>;
  /** Removes the organization and everything in it: its apps, keys, members and test users. */
  deleteOrganization(organization: string): Promise<void>;
  createApp(input: { organization: string; app: NewApp }): Promise<{ app: App; client_secret: string | null }>;
  updateApp(input: { client_id: string; patch: AppPatch }): Promise<App>;
  /** Live at once, or a review: `justifications` explains each sensitive scope it waits on. */
  publishApp(input: {
    client_id: string;
    justifications?: Record<string, string>;
    instructions?: string;
  }): Promise<{ state: 'live' | 'pending'; missing: string[] }>;
  rotateSecret(client_id: string): Promise<{ app: App; client_secret: string }>;
  revokeSecret(input: { client_id: string; secret: string }): Promise<App>;
  createKey(input: {
    organization: string;
    name: string;
    environment: 'sandbox' | 'live';
    scopes: string[];
  }): Promise<{ key: ApiKey; api_key: string }>;
  revokeKey(input: { organization: string; key: string }): Promise<ApiKey>;
  addTestUser(input: { organization: string; email: string }): Promise<void>;
  removeTestUser(input: { organization: string; email: string }): Promise<void>;
  /** Adds an account, or invites an address with none yet: the answer says which. */
  addMember(input: { organization: string; email: string; role: Role; apps?: string[] }): Promise<Member | Invitation>;
  withdrawInvitation(input: { organization: string; invitation: string }): Promise<void>;
  changeMember(input: { organization: string; member: string; role?: Role; apps?: string[] }): Promise<Member>;
  removeMember(input: { organization: string; member: string }): Promise<void>;
}

export const Developer = injectionToken<DeveloperService>('Developer');
