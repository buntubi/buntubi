/** The API product catalog: availability, the review each product needs, its scopes. */
import { cache, useRouteData } from '@fluixi/start/router';
import '@idp/elements/product-catalog';
import type { CatalogProduct, ProductCatalogLabels } from '@idp/elements/product-catalog/logic';
import { errorText, locale, t } from '../lib/i18n.js';
import type { ProductRow, ScopeRow } from '../lib/types.js';
import { loadProducts, loadScopes } from '../server/admin.js';

const products = cache(() => loadProducts(), 'products');
const scopes = cache(() => loadScopes(), 'scopes');
export const routeData = () => Promise.all([products(), scopes()]);

const labels = (): ProductCatalogLabels => ({
  empty: t('products.empty'),
  noScopes: t('products.noScopes'),
  addScope: t('products.addScope'),
  pickScope: t('products.pickScope'),
  removeScope: t('products.removeScope', { scope: '{scope}' }),
  availability: t('products.availability'),
  availabilities: { ga: t('products.ga'), beta: t('products.beta'), sandbox: t('products.sandbox') },
  approvals: {
    none: t('products.approval.none'),
    review: t('products.approval.review'),
    restricted: t('products.approval.restricted'),
  },
  newProduct: t('products.new'),
  slug: t('products.slug'),
  nameFr: t('products.nameFr'),
  nameEn: t('products.nameEn'),
  descriptionFr: t('products.descriptionFr'),
  descriptionEn: t('products.descriptionEn'),
  category: t('products.category'),
  create: t('products.create'),
  error: t('error.generic'),
});

export default function ProductsPage() {
  const data = useRouteData<[ProductRow[], ScopeRow[]]>();
  const catalog = (): CatalogProduct[] =>
    (data()?.[0] ?? []).map((row) => ({
      slug: row.slug,
      name: row.names[locale()] ?? row.slug,
      description: row.descriptions[locale()] ?? '',
      availability: row.availability,
      approval: row.approval,
      scopes: row.scopes,
    }));
  // A restricted scope is the platform's own; it never goes in a product.
  const free = () =>
    (data()?.[1] ?? []).filter((scope) => !scope.product && scope.sensitivity !== 'restricted').map((scope) => scope.name);
  return (
    <section>
      <h1>{() => t('products.title')}</h1>
      <p class="lead">{() => t('products.lead')}</p>
      <dp-product-catalog products={catalog()} freeScopes={free()} labels={labels()} describe={errorText} />
    </section>
  );
}
