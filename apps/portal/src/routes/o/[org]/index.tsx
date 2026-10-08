/** Developer Home: the organization's apps and the way to a new one. */
import { useRouteData, type RouteDataArgs } from '@fluixi/start/router';
import '@idp/elements/app-list';
import type { AppRow } from '@idp/elements/app-list/logic';
import { appListLabels } from '../../../lib/labels.js';
import { locale, t } from '../../../lib/i18n.js';
import type { Workspace } from '../../../lib/types.js';
import { paramOf } from '../../../lib/params.js';
import { workspace } from './layout.js';

export const routeData = (args: RouteDataArgs) => workspace(paramOf(args, 'org'));

export default function DeveloperHome() {
  const data = useRouteData<Workspace>();
  const organization = () => data()?.current?.organization;
  const productName = (slug: string) => {
    const product = data()?.products.find((p) => p.slug === slug);
    return product?.names[locale()] ?? product?.names.en ?? slug;
  };
  const rows = (): AppRow[] =>
    (data()?.current?.apps ?? []).map((app) => ({
      client_id: app.client_id,
      name: app.name,
      // The app pages still live where they were before the workspace.
      href: `/apps/${app.client_id}`,
      environment: app.environment,
      review_status: app.review_status,
      apis: app.products.map(productName),
    }));
  const firstName = () => data()?.me.name?.split(' ')[0] ?? '';
  return (
    <div class="stack">
      <header class="page-head">
        <div>
          <p class="eyebrow">{() => t('home.eyebrow')}</p>
          <h1>{() => (firstName() ? t('home.welcome', { name: firstName() }) : t('home.welcomeAnon'))}</h1>
        </div>
        <div class="page-actions">
          <Link class="action primary" href={`/organizations/${organization()?.id ?? ''}`}>
            {() => t('home.create')}
          </Link>
        </div>
      </header>
      <dp-app-list apps={rows()} labels={appListLabels()} />
    </div>
  );
}
