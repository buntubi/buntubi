/** An app's basic information. */
import { Stack } from '@fluixi-ui/layout';
import { useRouteData } from '@fluixi/start/router';
import { can } from '@buntubi/sdk/roles';
import '@idp/elements/app-organizations';
import '@idp/elements/app-sign-in';
import '@idp/elements/app-settings';
import { appRouteData, type AppPageData } from '../../../../../data/developer.js';
import { errorText, t } from '../../../../../lib/i18n.js';
import { appOrganizationsLabels, appSettingsLabels, appSignInLabels, formMessages } from '../../../../../lib/labels.js';
import '@idp/elements/page-header';

export const routeData = appRouteData;

export default function SettingsPage() {
  const data = useRouteData<AppPageData>();
  return (
    <Stack gap={5}>
      <idp-page-header title={t('appws.basicInfo')} intro={t('st.intro')} />
      <idp-app-settings
      app={data()?.app.app ?? null}
      canEdit={can(data()?.app, 'edit_apps')}
      labels={appSettingsLabels()}
      messages={formMessages()}
      describe={errorText}
      />
      <idp-app-organizations
        app={data()?.app.app ?? null}
        canEdit={can(data()?.app, 'edit_apps')}
        labels={appOrganizationsLabels()}
        describe={errorText}
      />
      <idp-app-sign-in
        app={data()?.app.app ?? null}
        canEdit={can(data()?.app, 'edit_apps')}
        labels={appSignInLabels()}
        describe={errorText}
      />
    </Stack>
  );
}
