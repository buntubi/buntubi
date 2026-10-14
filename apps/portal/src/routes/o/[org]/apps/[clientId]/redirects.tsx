/** Where an app may send people back after sign-in: its redirect addresses. */
import { Stack } from '@fluixi-ui/layout';
import { useRouteData } from '@fluixi/start/router';
import { can } from '@buntu/sdk/roles';
import '@idp/elements/page-header';
import '@idp/elements/redirect-uris';
import { appRouteData, type AppPageData } from '../../../../../data/developer.js';
import { errorText, t } from '../../../../../lib/i18n.js';
import { redirectUrisLabels, formMessages } from '../../../../../lib/labels.js';

export const routeData = appRouteData;

export default function RedirectsPage() {
  const data = useRouteData<AppPageData>();
  return (
    <Stack gap={5}>
      <idp-page-header title={t('appws.redirects')} />
      <idp-redirect-uris
        app={data()?.app.app ?? null}
        canManage={can(data()?.app.role, 'edit_apps')}
        labels={redirectUrisLabels()}
        messages={formMessages()}
        describe={errorText}
      />
    </Stack>
  );
}
