/** What an app asks of the people who sign in, by API product. */
import { Stack } from '@fluixi-ui/layout';
import { useRouteData } from '@fluixi/start/router';
import { can } from '@idp/sdk/roles';
import '@idp/elements/permissions';
import { appRouteData, type AppPageData } from '../../../../../data/developer.js';
import { paths } from '../../../../../lib/paths.js';
import { errorText, locale, t } from '../../../../../lib/i18n.js';
import { permissionsLabels } from '../../../../../lib/labels.js';
import '@idp/elements/page-header';

export const routeData = appRouteData;

export default function PermissionsPage() {
  const data = useRouteData<AppPageData>();
  const app = () => data()?.app.app ?? null;
  return (
    <Stack gap={5}>
      <idp-page-header title={t('appws.permissionsTitle')} />
      <idp-permissions
        app={app()}
        products={data()?.workspace.products ?? []}
        overview={data()?.app.overview ?? null}
        canEdit={can(data()?.app.role, 'edit_apps')}
        reviewHref={paths.app(app()?.organization_id ?? '', app()?.client_id ?? '')}
        locale={locale()}
        labels={permissionsLabels()}
        describe={errorText}
      />
    </Stack>
  );
}
