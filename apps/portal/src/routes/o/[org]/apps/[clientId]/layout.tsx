/**
 * An app's workspace: the section the sidebar chose, or a way back when the app is not there.
 * The sidebar itself is the organization layout's, switched to the app.
 */
import { useRouteData } from '@fluixi/start/router';
import '@idp/elements/not-found';
import { appRouteData, type AppPageData } from '../../../../../data/developer.js';
import { t } from '../../../../../lib/i18n.js';
import { paths } from '../../../../../lib/paths.js';

export const routeData = appRouteData;

export default function AppLayout() {
  const data = useRouteData<AppPageData>();
  return (
    <Show
      when={data()?.app.app}
      fallback={
        <idp-not-found
          href={paths.organization(data()?.workspace.current?.organization.id ?? '')}
          labels={{ title: t('appws.notFound'), text: t('appws.notFoundText'), back: t('appws.allApps') }}
        />
      }
    >
      <Outlet />
    </Show>
  );
}
