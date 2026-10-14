/** The API products a developer can build on, searchable and by category, apart from the look. */
import type { Product } from '@buntu/sdk/types';

export type ProductAuth = Product['auth'][number];

export interface ProductBrowserLabels {
  search: string;
  all: string;
  auth: Record<ProductAuth, string>;
  availability: Record<Product['availability'], string>;
  approval: Record<Product['approval'], string>;
  docs: string;
  /** A category's name; its slug when absent. */
  categories: Record<string, string>;
  empty: string;
  noMatch: string;
}

export const productBrowserLabels: ProductBrowserLabels = {
  search: 'Search products and scopes',
  all: 'All',
  auth: { oauth2: 'OAuth 2.0', oidc: 'OpenID Connect', api_key: 'API key', webhooks: 'Signed webhooks' },
  availability: { ga: 'GA', beta: 'Beta', sandbox: 'Sandbox' },
  approval: { none: 'No review for basic scopes', review: 'App review', restricted: 'Restricted' },
  docs: 'Docs',
  categories: {},
  empty: 'No API product is available yet.',
  noMatch: 'No product matches.',
};

export interface ProductCard {
  slug: string;
  name: string;
  description: string;
  category: string;
  auth: string;
  availability: Product['availability'];
  approval: Product['approval'];
  scopes: string[];
  docs: string | null;
}

export interface ProductBrowserLogic {
  labels: () => ProductBrowserLabels;
  query: () => string;
  search: (value: string) => void;
  category: () => string;
  categories: () => { value: string; label: string }[];
  choose: (category: string) => void;
  products: () => ProductCard[];
  total: () => number;
}
