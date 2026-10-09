/** Developer Home: the organization's apps, what waits on its members, and the way to a new app. */
import { Grid, Stack } from '@fluixi-ui/layout';
import { useRouteData, type RouteDataArgs } from '@fluixi/start/router';
import '@idp/elements/app-list';
import type { AppRow } from '@idp/elements/app-list/logic';
import '@idp/elements/idea-to-live';
import '@idp/elements/needs-attention';
import '@idp/elements/page-header';
import '@idp/elements/stat-group';
import { locale, t } from '../../../lib/i18n.js';
import { appListLabels, homeStats, ideaToLiveLabels, needsAttentionLabels } from '../../../lib/labels.js';
import { paramOf } from '../../../lib/params.js';
import { paths } from '../../../lib/paths.js';
import type { Workspace } from '../../../lib/types.js';
import { workspace } from '../../../data/developer.js';

export const routeData = (args: RouteDataArgs) => workspace(paramOf(args, 'org'));

const PLUS = 'M12 5v14M5 12h14';

export default function DeveloperHome() {
  const data = useRouteData<Workspace>();
  const organization = () => data()?.current?.organization.id ?? '';
  const apps = () => data()?.current?.apps ?? [];
  const productName = (slug: string) => {
    const product = data()?.products.find((p) => p.slug === slug);
    return product?.names[locale()] ?? product?.names.en ?? slug;
  };
  const rows = (): AppRow[] =>
    apps().map((app) => ({
      client_id: app.client_id,
      name: app.name,
      href: paths.app(organization(), app.client_id),
      environment: app.environment,
      review_status: app.review_status,
      apis: app.products.map(productName),
    }));
  const firstName = () => data()?.me.name?.split(' ')[0] ?? '';
  return (
    <Stack gap={6}>
      <idp-page-header
        eyebrow={t('home.eyebrow')}
        title={firstName() ? t('home.welcome', { name: firstName() }) : t('home.welcomeAnon')}
        actions={[
          { label: t('home.explore'), href: paths.organization(organization(), 'products'), variant: 'outline' },
          { label: t('home.create'), href: paths.newApp(organization()), variant: 'solid', icon: PLUS },
        ]}
      />
      <idp-stat-group stats={homeStats(apps())} />
      <Grid columns={{ base: 1, lg: 'minmax(0, 1fr) 362px' }} gap={5} align="start">
        <idp-app-list apps={rows()} labels={appListLabels()} />
        <idp-needs-attention
          apps={apps().map((app) => ({ ...app, href: paths.app(organization(), app.client_id) }))}
          labels={needsAttentionLabels()}
        />
      </Grid>
      <idp-idea-to-live labels={ideaToLiveLabels()} />
    </Stack>
  );
}
