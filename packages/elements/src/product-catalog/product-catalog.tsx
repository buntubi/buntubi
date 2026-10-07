/**
 * The owner's catalog of API products: their availability, the review each needs, and the
 * scopes they bring. Changes go through the injected `Admin` service; the host refreshes the
 * data its service invalidates.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/start/di';
import { Admin } from '@idp/sdk/admin';
import { useView } from '../view.js';
import {
  productCatalogLabels,
  type CatalogProduct,
  type ProductCatalogLabels,
  type ProductCatalogLogic,
  type ProductDraft,
} from './logic.js';
import { ProductCatalogView } from './view.js';

const EMPTY: ProductDraft = {
  slug: '',
  nameFr: '',
  nameEn: '',
  descriptionFr: '',
  descriptionEn: '',
  category: '',
  availability: 'ga',
};

const props = {
  products: prop.object<CatalogProduct[]>([]),
  freeScopes: prop.object<string[]>([]),
  labels: prop.object<Partial<ProductCatalogLabels>>({}),
  /** Words a refusal for the reader; the generic label when absent. */
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

export class DpProductCatalog extends typedElement(props) {
  protected override render(): unknown {
    const admin = inject(Admin);
    const busy = signal<string | null>(null);
    const error = signal<string | null>(null);
    const draft = signal<ProductDraft>({ ...EMPTY });
    const labels = () => ({ ...productCatalogLabels, ...this.labels });
    const run = async (key: string, work: () => Promise<void>): Promise<boolean> => {
      busy.set(key);
      error.set(null);
      try {
        await work();
        return true;
      } catch (failure) {
        error.set(this.describe?.(failure) ?? labels().error);
        return false;
      } finally {
        busy.set(null);
      }
    };
    const logic: ProductCatalogLogic = {
      products: () => this.products,
      freeScopes: () => this.freeScopes,
      labels,
      busy,
      error,
      draft,
      edit: (field, value) => draft.set({ ...draft(), [field]: value }),
      create: async () => {
        const d = draft();
        const done = await run('new', () =>
          admin.createProduct({
            slug: d.slug.trim(),
            names: { fr: d.nameFr.trim(), en: d.nameEn.trim() },
            descriptions: { fr: d.descriptionFr.trim(), en: d.descriptionEn.trim() },
            category: d.category.trim(),
            availability: d.availability,
          }),
        );
        if (done) draft.set({ ...EMPTY });
      },
      setAvailability: async (slug, availability) => {
        await run(slug, () => admin.setAvailability({ slug, availability }));
      },
      addScope: async (slug, scope) => {
        await run(scope, () => admin.setScopeProduct({ scope, product: slug }));
      },
      removeScope: async (scope) => {
        await run(scope, () => admin.setScopeProduct({ scope, product: null }));
      },
    };
    return useView(ProductCatalogView)(logic);
  }
}

defineCustomElement('dp-product-catalog', DpProductCatalog);

declare global {
  interface HTMLElementTagNameMap {
    'dp-product-catalog': DpProductCatalog;
  }
  interface JSXCustomElements {
    'dp-product-catalog': ElementAttributes<typeof props>;
  }
}
