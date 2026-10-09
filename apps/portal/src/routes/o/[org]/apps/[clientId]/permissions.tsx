/** What an app asks of the people who sign in, by API product. */
import { useRouteData } from '@fluixi/start/router';
import { can } from '@idp/sdk/roles';
import '@idp/elements/permissions';
import { appPath, appRouteData, type AppPageData } from '../../../../../lib/app-route.js';
import { errorText, locale, t } from '../../../../../lib/i18n.js';
import { permissionsLabels } from '../../../../../lib/labels.js';

export const routeData = appRouteData;

export default function PermissionsPage() {
  const data = useRouteData<AppPageData>();
  const app = () => data()?.app.app ?? null;
  return (
    <div class="stack">
      <style scoped>{`h2 { margin: 0; font-size: 18px; font-weight: 600; }`}</style>
      <h2>{() => t('appws.permissionsTitle')}</h2>
      <idp-permissions
        app={app()}
        products={data()?.workspace.products ?? []}
        overview={data()?.app.overview ?? null}
        canEdit={can(data()?.app.role, 'edit_apps')}
        reviewHref={appPath(app()?.organization_id ?? '', app()?.client_id ?? '')}
        locale={locale()}
        labels={permissionsLabels()}
        describe={errorText}
      />
    </div>
  );
}
