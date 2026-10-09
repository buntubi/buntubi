/**
 * The way in: an invitation to sign in, the developer terms, a first organization, or for a
 * developer with organizations, their first workspace.
 */
import { cache, Redirect, useNavigate, useRouteData } from '@fluixi/start/router';
import '@idp/elements/developer-terms';
import '@idp/elements/organization-form';
import '@idp/elements/organization-tiles';
import '@idp/elements/welcome';
import { PublicFrame } from '../components/public-frame.js';
import { errorText, t } from '../lib/i18n.js';
import { developerTermsLabels, organizationFormLabels, welcomeLabels } from '../lib/labels.js';
import type { Home } from '../lib/types.js';
import { loadHome } from '../server/developer.js';
import { auth } from '../services/auth.js';

const home = cache(() => loadHome(), 'home');
export const routeData = () => home();

export default function HomePage() {
  const data = useRouteData<Home>();
  const navigate = useNavigate();
  const me = () => data()?.me ?? null;
  const first = () => data()?.organizations[0]?.id;
  return (
    <PublicFrame>
      <Switch
        fallback={
          <div class="start">
            <idp-organization-tiles
              organizations={data()?.organizations ?? []}
              title={t('organizations.title')}
              empty={t('organizations.empty')}
              href="/o/{id}"
            />
            <idp-organization-form
              labels={organizationFormLabels()}
              describe={errorText}
              onCreated={(event) => navigate(`/o/${encodeURIComponent(event.detail.id)}`)}
            />
          </div>
        }
      >
        <Match when={!me()}>
          <idp-welcome labels={welcomeLabels()} onSignin={() => auth.signIn({ returnTo: '/' })} />
        </Match>
        <Match when={me() && !me()?.developer}>
          <idp-developer-terms labels={developerTermsLabels()} describe={errorText} />
        </Match>
        <Match when={first()}>
          {(id: string) => <Redirect to={`/o/${id}`} />}
        </Match>
      </Switch>
    </PublicFrame>
  );
}
