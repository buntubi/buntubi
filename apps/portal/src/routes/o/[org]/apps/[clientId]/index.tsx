/** An app's overview: its way to live, what it still needs, and the access it has. */
import { useRouteData } from '@fluixi/start/router';
import { can } from '@idp/sdk/roles';
import '@idp/elements/app-scopes';
import '@idp/elements/review-note';
import '@idp/elements/launch-path';
import { appPath, appRouteData, type AppPageData } from '../../../../../lib/app-route.js';
import { errorText, t } from '../../../../../lib/i18n.js';
import { appScopesLabels, launchPathLabels } from '../../../../../lib/labels.js';

export const routeData = appRouteData;

export default function AppOverviewPage() {
  const data = useRouteData<AppPageData>();
  const app = () => data()?.app.app ?? null;
  const overview = () => data()?.app.overview ?? null;
  const section = (name: string) => appPath(app()?.organization_id ?? '', app()?.client_id ?? '', name);
  const links = () => ({
    basic_info: section('settings'),
    policies: section('settings'),
    redirect_uri: section('credentials'),
    products: section('permissions'),
    permissions: section('permissions'),
    support_email: `/o/${app()?.organization_id ?? ''}/settings`,
  });
  return (
    <div class="stack">
      <idp-review-note note={app()?.review_note ?? ''} title={t('appws.feedback')} />
      <idp-launch-path
        clientId={app()?.client_id ?? ''}
        overview={overview()}
        links={links()}
        canPublish={can(data()?.app.role, 'publish')}
        reviewHref={section('review')}
        labels={launchPathLabels()}
        describe={errorText}
      />
      <idp-app-scopes scopes={overview()?.scopes ?? null} manageHref={section('permissions')} labels={appScopesLabels()} />
    </div>
  );
}
