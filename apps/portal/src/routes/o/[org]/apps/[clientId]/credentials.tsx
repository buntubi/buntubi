/** An app's credentials: client and secrets, redirect URIs, API keys, signing keys. */
import { useRouteData } from '@fluixi/start/router';
import { can } from '@idp/sdk/roles';
import '@idp/elements/credentials';
import { appRouteData, type AppPageData } from '../../../../../lib/app-route.js';
import { errorText, locale, t } from '../../../../../lib/i18n.js';
import { credentialsLabels } from '../../../../../lib/labels.js';
import { takeSecret } from '../../../../../lib/one-time.js';

export const routeData = appRouteData;

export default function CredentialsPage() {
  const data = useRouteData<AppPageData>();
  const app = () => data()?.app.app ?? null;
  // The secret from the creation answer, handed over by the page that created the app.
  const secret = takeSecret(app()?.client_id ?? '') ?? '';
  return (
    <div class="stack">
      <style scoped>{`h2 { margin: 0; font-size: 18px; font-weight: 600; }`}</style>
      <h2>{() => t('appws.credentialsTitle')}</h2>
      <dp-credentials
        app={app()}
        keys={data()?.workspace.current?.keys ?? []}
        organization={app()?.organization_id ?? ''}
        jwksUrl={`${data()?.app.issuer ?? ''}/.well-known/jwks.json`}
        canManage={can(data()?.app.role, 'edit_apps')}
        secret={secret}
        locale={locale()}
        labels={credentialsLabels()}
        describe={errorText}
      />
    </div>
  );
}
