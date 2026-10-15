/** What an app asks of the people who sign in, by API product. */
import { useRouteData } from '@fluixi/start/router';
import { can } from '@buntubi/sdk/roles';
import '@idp/elements/permissions';
import { appRouteData, type AppPageData } from '../../../../../data/developer.js';
import { paths } from '../../../../../lib/paths.js';
import { errorText, locale } from '../../../../../lib/i18n.js';
import { permissionsLabels } from '../../../../../lib/labels.js';

export const routeData = appRouteData;

export default function PermissionsPage() {
  const data = useRouteData<AppPageData>();
  const app = () => data()?.app.app ?? null;
  return (
    <idp-permissions
      app={app()}
      products={data()?.workspace.products ?? []}
      overview={data()?.app.overview ?? null}
      canEdit={can(data()?.app, 'edit_apps')}
      reviewHref={paths.app(app()?.organization_id ?? '', app()?.client_id ?? '', 'review')}
      productsHref={paths.organization(app()?.organization_id ?? '', 'products')}
      locale={locale()}
      labels={permissionsLabels()}
      describe={errorText}
    />
  );
}
