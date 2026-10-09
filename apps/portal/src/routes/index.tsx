/**
 * The way in: an invitation to sign in, the developer terms, then the organization the
 * developer chose, while they still belong to it, or the picker.
 */
import { Redirect, useRouteData } from '@fluixi/start/router';
import '@idp/elements/developer-terms';
import '@idp/elements/welcome';
import { usePreferences } from '@idp/shell/preferences';
import { PublicPage } from '../components/public-page.js';
import { home } from '../data/developer.js';
import { errorText, locale, setLocale, t } from '../lib/i18n.js';
import { developerTermsLabels, welcomeLabels } from '../lib/labels.js';
import { paths } from '../lib/paths.js';
import type { Home } from '../lib/types.js';
import { auth } from '../services/auth.js';

export const routeData = () => home();

export default function HomePage() {
  const data = useRouteData<Home>();
  const { organization } = usePreferences('portal', { locale, setLocale });
  const me = () => data()?.me ?? null;
  // The saved choice counts only while the person still belongs to it.
  const chosen = () => {
    const id = organization();
    return id && data()?.organizations.some((entry) => entry.id === id) ? id : '';
  };
  return (
    <PublicPage>
      <Switch
        fallback={<Redirect to={paths.organizations()} />}
      >
        <Match when={!me()}>
          <idp-welcome labels={welcomeLabels()} onSignin={() => auth.signIn({ returnTo: paths.start() })} />
        </Match>
        <Match when={me() && !me()?.developer}>
          <idp-developer-terms labels={developerTermsLabels()} describe={errorText} />
        </Match>
        <Match when={chosen()}>
          {(id: string) => <Redirect to={paths.organization(id)} />}
        </Match>
      </Switch>
    </PublicPage>
  );
}
