/** The platform's API products, for a developer choosing what to build on. Read only. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { memo, signal } from '@fluixi/reactive/signal';
import type { Localized, Product } from '@buntu/sdk/types';
import '../product-tile/product-tile.js';
import '../segmented/segmented.js';
import { useView } from '../view.js';
import { productBrowserLabels, type ProductBrowserLabels, type ProductBrowserLogic, type ProductCard } from './logic.js';
import { ProductBrowserView } from './view.js';

const props = {
  products: prop.object<Product[]>([]),
  locale: prop.string('en'),
  labels: prop.object<Partial<ProductBrowserLabels>>({}),
};

export class IdpProductBrowser extends typedElement(props) {
  protected override render(): unknown {
    const labels = () => ({ ...productBrowserLabels, ...this.labels });
    const query = signal('');
    const category = signal<string | null>(null);
    const words = (text: Localized) => (this.locale === 'fr' ? text.fr : text.en) || text.en || text.fr || '';

    const cards = memo((): ProductCard[] =>
      this.products.map((product) => ({
        slug: product.slug,
        name: words(product.names) || product.slug,
        description: words(product.descriptions),
        category: product.category,
        auth: product.auth.map((entry) => labels().auth[entry]).join(', '),
        availability: product.availability,
        approval: product.approval,
        scopes: product.scopes.map((scope) => scope.name),
        docs: product.docs_url,
      })),
    );

    const logic: ProductBrowserLogic = {
      labels,
      query,
      search: (value) => query.set(value),
      category: () => category() ?? '',
      categories: () => {
        const names = [...new Set(cards().map((card) => card.category).filter(Boolean))].sort();
        const name = (value: string) => labels().categories[value] ?? value.charAt(0).toUpperCase() + value.slice(1);
        return [{ value: '', label: labels().all }, ...names.map((value) => ({ value, label: name(value) }))];
      },
      choose: (value) => category.set(value || null),
      products: () => {
        const needle = query().trim().toLowerCase();
        return cards().filter(
          (card) =>
            (category() === null || card.category === category()) &&
            (!needle ||
              [card.name, card.description, card.slug, ...card.scopes].some((text) => text.toLowerCase().includes(needle))),
        );
      },
      total: () => cards().length,
    };
    return useView(ProductBrowserView)(logic);
  }
}

defineCustomElement('idp-product-browser', IdpProductBrowser);

declare global {
  interface HTMLElementTagNameMap {
    'idp-product-browser': IdpProductBrowser;
  }
  interface JSXCustomElements {
    'idp-product-browser': ElementAttributes<typeof props>;
  }
}
