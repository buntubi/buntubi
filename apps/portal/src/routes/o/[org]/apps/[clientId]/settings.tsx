/** An app's basic information. */
import { useRouteData } from '@fluixi/start/router';
import { can } from '@idp/sdk/roles';
import '@idp/elements/app-settings';
import { appRouteData, type AppPageData } from '../../../../../lib/app-route.js';
import { errorText } from '../../../../../lib/i18n.js';
import { appSettingsLabels } from '../../../../../lib/labels.js';

export const routeData = appRouteData;

export default function SettingsPage() {
  const data = useRouteData<AppPageData>();
  return (
    <idp-app-settings
      app={data()?.app.app ?? null}
      canEdit={can(data()?.app.role, 'edit_apps')}
      labels={appSettingsLabels()}
      describe={errorText}
    />
  );
}
