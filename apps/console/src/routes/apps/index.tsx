/** Every app on the platform: whose it is, where it runs, and which skip consent. */
import { Stack } from '@fluixi-ui/layout';
import { StickyHead } from '@idp/shell/sticky-head';
import { useLocation, useNavigate, useRouteData, type RouteDataArgs } from '@fluixi/start/router';
import { publicEnv } from '@fluixi/start/env';
import '@idp/elements/client-list';
import '@idp/elements/page-header';
import '@idp/elements/search-box';
import { icons } from '@idp/shell/icons';
import { clients, me } from '../../data/admin.js';
import { errorText, t } from '../../lib/i18n.js';
import { clientListLabels, clientRowLabels } from '../../lib/labels.js';
import { searchOf } from '../../lib/params.js';
import { paths, portalPaths } from '../../lib/paths.js';
import type { ClientRow, Me } from '../../lib/types.js';

interface AppsData {
  clients: ClientRow[];
  me: Me;
}

export const routeData = async (args: RouteDataArgs): Promise<AppsData> => {
  const [list, viewer] = await Promise.all([clients(searchOf(args, 'q')), me()]);
  return { clients: list, me: viewer };
};

export default function AppsPage() {
  const data = useRouteData<AppsData>();
  const navigate = useNavigate();
  const location = useLocation();
  // A platform app is made in the portal, in the platform organization, like any other app.
  const actions = () => {
    const organization = data()?.me.platform_organization_id;
    const portal = publicEnv().PORTAL_URL;
    return organization && portal
      ? [{ label: t('apps.new'), href: portalPaths.newApp(portal, organization), variant: 'solid' as const, icon: icons.apps }]
      : [];
  };
  return (
    <Stack gap={5}>
      <StickyHead>
        <idp-page-header title={t('apps.title')} intro={t('apps.intro')} actions={actions()} />
        <idp-search-box
          query={location.query.q ?? ''}
          label={t('common.search')}
          onSearch={(event) => navigate(paths.apps(event.detail.q), { replace: true })}
        />
      </StickyHead>
      <idp-client-list
        clients={data()?.clients ?? []}
        href={paths.appPattern()}
        labels={clientListLabels()}
        rowLabels={clientRowLabels()}
        describe={errorText}
      />
    </Stack>
  );
}
