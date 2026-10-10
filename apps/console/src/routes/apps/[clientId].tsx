/** One app: what the console knows and decides about it; the rest is edited in the portal. */
import { Stack } from '@fluixi-ui/layout';
import { publicEnv } from '@fluixi/start/env';
import { useRouteData, type RouteDataArgs } from '@fluixi/start/router';
import '@idp/elements/client-detail';
import '@idp/elements/not-found';
import '@idp/elements/page-header';
import { client } from '../../data/admin.js';
import { errorText, locale, t } from '../../lib/i18n.js';
import { clientDetailLabels } from '../../lib/labels.js';
import { paramOf } from '../../lib/params.js';
import { paths, portalPaths } from '../../lib/paths.js';
import type { ClientRow } from '../../lib/types.js';

export const routeData = (args: RouteDataArgs) => client(paramOf(args, 'clientId'));

export default function AppPage() {
  const data = useRouteData<ClientRow | null>();
  return (
    <Show
      when={data()}
      fallback={<idp-not-found href={paths.apps()} labels={{ title: t('apps.notFound'), text: '', back: t('apps.back') }} />}
    >
      <Stack gap={5}>
        <idp-page-header
          title={data()?.name ?? ''}
          intro={data()?.client_id ?? ''}
          actions={[{ label: t('apps.back'), href: paths.apps(), variant: 'outline' }]}
        />
        <idp-client-detail
          client={data() ?? null}
          portalHref={publicEnv().PORTAL_URL ? portalPaths.appPattern(publicEnv().PORTAL_URL ?? '') : ''}
          locale={locale()}
          labels={clientDetailLabels()}
          describe={errorText}
        />
      </Stack>
    </Show>
  );
}
