/**
 * What console elements may ask of the admin API. No default: the console provides it in its
 * module, mapped to its server functions.
 */
import { injectionToken } from '@fluixi/start/di';

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
}

export const Admin = injectionToken<AdminService>('Admin');
