/** The platform's API products, for choosing what an app builds on. */
import { Stack } from '@fluixi-ui/layout';
import { useRouteData, type RouteDataArgs } from '@fluixi/start/router';
import '@idp/elements/product-browser';
import { locale, t } from '../../../lib/i18n.js';
import { productBrowserLabels } from '../../../lib/labels.js';
import { paramOf } from '../../../lib/params.js';
import type { Workspace } from '../../../lib/types.js';
import { workspace } from '../../../data/developer.js';
import '@idp/elements/page-header';

export const routeData = (args: RouteDataArgs) => workspace(paramOf(args, 'org'));

export default function ProductsPage() {
  const data = useRouteData<Workspace>();
  return (
    <Stack gap={5}>
      <idp-page-header title={t('page.products')} intro={t('page.productsIntro')} />
      <idp-product-browser products={data()?.products ?? []} locale={locale()} labels={productBrowserLabels()} />
    </Stack>
  );
}
