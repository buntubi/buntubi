/** Every app on the platform: whose it is, where it runs, and which skip consent. */
import { Stack } from '@fluixi-ui/layout';
import { StickyHead } from '@idp/shell/sticky-head';
import { useLocation, useNavigate, useRouteData, type RouteDataArgs } from '@fluixi/start/router';
import '@idp/elements/client-list';
import '@idp/elements/page-header';
import '@idp/elements/search-box';
import { clients } from '../data/admin.js';
import { errorText, t } from '../lib/i18n.js';
import { clientListLabels, clientRowLabels } from '../lib/labels.js';
import { searchOf } from '../lib/params.js';
import { paths } from '../lib/paths.js';
import type { ClientRow } from '../lib/types.js';

export const routeData = (args: RouteDataArgs) => clients(searchOf(args, 'q'));

export default function AppsPage() {
  const data = useRouteData<ClientRow[]>();
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <Stack gap={5}>
      <StickyHead>
        <idp-page-header title={t('apps.title')} />
        <idp-search-box
          query={location.query.q ?? ''}
          label={t('common.search')}
          onSearch={(event) => navigate(paths.apps(event.detail.q), { replace: true })}
        />
      </StickyHead>
      <idp-client-list clients={data() ?? []} labels={clientListLabels()} rowLabels={clientRowLabels()} describe={errorText} />
    </Stack>
  );
}
