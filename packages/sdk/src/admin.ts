/**
 * What console elements may ask of the admin API. No default: the console provides it in its
 * module, mapped to its server functions.
 */
import { injectionToken } from '@fluixi/start/di';
import type { ScopeEntry } from './types.js';

export type Availability = 'ga' | 'beta' | 'sandbox';

export interface NewProduct {
  slug: string;
  names: { fr: string; en: string };
  descriptions: { fr: string; en: string };
  category: string;
  availability: Availability;
}

export interface AdminService {
  createProduct(input: NewProduct): Promise<void>;
  setAvailability(input: { slug: string; availability: Availability }): Promise<void>;
  /** Puts a scope in a product, or takes it out with `null`. */
  setScopeProduct(input: { scope: string; product: string | null }): Promise<void>;
  /** Answers an app's review: approving puts it live; a rejection needs a note. */
  review(input: { client_id: string; approve: boolean; note: string }): Promise<void>;
  /** Stops an organization at once: its apps get no new tokens, and the ones they hold end. */
  suspendOrganization(input: { id: string; reason: string }): Promise<void>;
  restoreOrganization(id: string): Promise<void>;
  /** A disabled account cannot sign in, and its sessions end. */
  setUserDisabled(input: { id: string; disabled: boolean }): Promise<void>;
  createScope(input: ScopeEntry): Promise<void>;
}

export const Admin = injectionToken<AdminService>('Admin');
