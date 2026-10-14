/** An app's overview: who it is and its next step, its way to live, what it still needs, its access. */
import { Grid, Stack } from '@fluixi-ui/layout';
import { useRouteData } from '@fluixi/start/router';
import { can } from '@buntu/sdk/roles';
import '@idp/elements/app-header';
import '@idp/elements/app-scopes';
import '@idp/elements/launch-checklist';
import '@idp/elements/path-to-live';
import { appRouteData, type AppPageData } from '../../../../../data/developer.js';
import { errorText } from '../../../../../lib/i18n.js';
import { checkLinks, paths } from '../../../../../lib/paths.js';
import { appHeaderLabels, appScopesLabels, fieldNames, launchChecklistLabels, pathToLiveLabels } from '../../../../../lib/labels.js';

export const routeData = appRouteData;

export default function AppOverviewPage() {
  const data = useRouteData<AppPageData>();
  const app = () => data()?.app.app ?? null;
  const overview = () => data()?.app.overview ?? null;
  const organization = () => app()?.organization_id ?? '';
  const clientId = () => app()?.client_id ?? '';
  return (
    <Stack gap={5}>
      <idp-app-header
        app={app()}
        overview={overview()}
        canPublish={can(data()?.app.role, 'publish')}
        reviewHref={paths.app(organization(), clientId(), 'review')}
        fields={fieldNames()}
        labels={appHeaderLabels()}
        describe={errorText}
      />
      <idp-path-to-live overview={overview()} labels={pathToLiveLabels()} />
      <Grid columns={{ base: 1, lg: 'minmax(0, 1fr) 362px' }} gap={5} align="start">
        <idp-launch-checklist
          overview={overview()}
          links={checkLinks(organization(), clientId())}
          note={app()?.review_note ?? ''}
          reviewHref={paths.app(organization(), clientId(), 'review')}
          labels={launchChecklistLabels()}
        />
        <idp-app-scopes scopes={overview()?.scopes ?? null} manageHref={paths.app(organization(), clientId(), 'permissions')} labels={appScopesLabels()} />
      </Grid>
    </Stack>
  );
}
