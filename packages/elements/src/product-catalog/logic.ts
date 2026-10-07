/** The product catalog's data, words and behaviour, apart from how it looks. */
import type { Availability } from '@idp/sdk/admin';

export interface CatalogProduct {
  slug: string;
  /** In the reader's language. */
  name: string;
  description: string;
  availability: Availability;
  approval: 'none' | 'review' | 'restricted';
  scopes: string[];
}

export interface ProductCatalogLabels {
  empty: string;
  noScopes: string;
  addScope: string;
  pickScope: string;
  /** `{scope}` is replaced by the scope's name. */
  removeScope: string;
  availability: string;
  availabilities: Record<Availability, string>;
  approvals: Record<CatalogProduct['approval'], string>;
  newProduct: string;
  slug: string;
  nameFr: string;
  nameEn: string;
  descriptionFr: string;
  descriptionEn: string;
  category: string;
  create: string;
  error: string;
}

export const productCatalogLabels: ProductCatalogLabels = {
  empty: 'No product.',
  noScopes: 'No scope in this product.',
  addScope: 'Add a scope',
  pickScope: 'Pick a scope',
  removeScope: 'Remove {scope}',
  availability: 'Availability',
  availabilities: { ga: 'Available', beta: 'Beta', sandbox: 'Sandbox only' },
  approvals: { none: 'No review', review: 'Review required', restricted: 'Restricted' },
  newProduct: 'New product',
  slug: 'Identifier',
  nameFr: 'Name (French)',
  nameEn: 'Name (English)',
  descriptionFr: 'Description (French)',
  descriptionEn: 'Description (English)',
  category: 'Category',
  create: 'Create the product',
  error: 'Something went wrong. Try again.',
};

export interface ProductDraft {
  slug: string;
  nameFr: string;
  nameEn: string;
  descriptionFr: string;
  descriptionEn: string;
  category: string;
  availability: Availability;
}

export interface ProductCatalogLogic {
  products: () => CatalogProduct[];
  /** Scopes in no product, the ones that can be added. */
  freeScopes: () => string[];
  labels: () => ProductCatalogLabels;
  /** What is being saved: a product slug, a scope name, or `new`. */
  busy: () => string | null;
  error: () => string | null;
  draft: () => ProductDraft;
  edit: (field: keyof ProductDraft, value: string) => void;
  create: () => Promise<void>;
  setAvailability: (slug: string, availability: Availability) => Promise<void>;
  addScope: (slug: string, scope: string) => Promise<void>;
  removeScope: (scope: string) => Promise<void>;
}
