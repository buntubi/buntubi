/** The platform's API products, for choosing what an app builds on. */
import { useRouteData, type RouteDataArgs } from '@fluixi/start/router';
import '@idp/elements/product-browser';
import { locale, t } from '../../../lib/i18n.js';
import { productBrowserLabels } from '../../../lib/labels.js';
import { paramOf } from '../../../lib/params.js';
import type { Workspace } from '../../../lib/types.js';
import { workspace } from './layout.js';

export const routeData = (args: RouteDataArgs) => workspace(paramOf(args, 'org'));

export default function ProductsPage() {
  const data = useRouteData<Workspace>();
  return (
    <div class="stack">
      <header class="page-head">
        <div>
          <h1>{() => t('page.products')}</h1>
          <p class="page-intro">{() => t('page.productsIntro')}</p>
        </div>
      </header>
      <idp-product-browser products={data()?.products ?? []} locale={locale()} labels={productBrowserLabels()} />
    </div>
  );
}
