/**
 * The owner's catalog of API products: their availability, the review each needs, and the
 * scopes they bring. Changes go through the injected `Admin` service; the host refreshes the
 * data its service invalidates.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { createField, createForm } from '@fluixi/forms';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/start/di';
import { Admin } from '@buntu/sdk/admin';
import { productSchema, type ProductInput } from '@buntu/sdk/schemas/catalogue';
import { messageReader, type Messages } from '../messages.js';
import { fieldValidator, type FormSchema } from '../validators.js';
import { useView } from '../view.js';
import {
  productCatalogLabels,
  type CatalogProduct,
  type ProductCatalogLabels,
  type ProductCatalogLogic,
  type ProductForm, } from './logic.js';
import { ProductCatalogView } from './view.js';

const PRODUCT_FIELDS = ['slug', 'category', 'nameFr', 'nameEn', 'descriptionFr', 'descriptionEn'] as const;

const props = {
  products: prop.object<CatalogProduct[]>([]),
  freeScopes: prop.object<string[]>([]),
  labels: prop.object<Partial<ProductCatalogLabels>>({}),
  /** Words a refusal for the reader; the generic label when absent. */
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
  /** Checks a new product before it is sent; messages are keys read through `messages`. */
  schema: prop.any<FormSchema<ProductInput>>(productSchema),
  /** Text for validation keys; see messages.ts. */
  messages: prop.object<Messages>({}),
};

export class IdpProductCatalog extends typedElement(props) {
  protected override render(): unknown {
    const admin = inject(Admin);
    const busy = signal<string | null>(null);
    const error = signal<string | null>(null);
    const text = messageReader(() => this.messages);
    const check = <K extends keyof ProductInput & string>(field: K) =>
      fieldValidator<ProductInput, K>(() => this.schema, field, text);
    const form: ProductForm = createForm({
      slug: createField('', { validators: [check('slug')] }),
      category: createField('', { validators: [check('category')] }),
      nameFr: createField('', { validators: [check('nameFr')] }),
      nameEn: createField('', { validators: [check('nameEn')] }),
      descriptionFr: createField('', { validators: [check('descriptionFr')] }),
      descriptionEn: createField('', { validators: [check('descriptionEn')] }),
    });
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
      form,
      create: async (values) => {
        const done = await run('new', () =>
          admin.createProduct({
            slug: values.slug.trim(),
            names: { fr: values.nameFr.trim(), en: values.nameEn.trim() },
            descriptions: { fr: values.descriptionFr.trim(), en: values.descriptionEn.trim() },
            category: values.category.trim(),
            availability: 'ga',
          }),
        );
        if (done) for (const key of PRODUCT_FIELDS) form.get(key).reset('');
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

defineCustomElement('idp-product-catalog', IdpProductCatalog);

declare global {
  interface HTMLElementTagNameMap {
    'idp-product-catalog': IdpProductCatalog;
  }
  interface JSXCustomElements {
    'idp-product-catalog': ElementAttributes<typeof props>;
  }
}
