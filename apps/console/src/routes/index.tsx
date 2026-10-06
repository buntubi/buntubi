/** The entrance: why the console is closed to this visitor, or the overview. */
import { cache, useRouteData } from '@fluixi/start/router';
import { Button } from '@fluixi-ui/button';
import { Card, CardBody } from '@fluixi-ui/card';
import { t } from '../lib/i18n.js';
import { loadOverview } from '../server/admin.js';
import { auth, idpUrl } from '../services/auth.js';

const overview = cache(() => loadOverview(), 'overview');
export const routeData = () => overview();

type Data = Awaited<ReturnType<typeof loadOverview>>;

export default function OverviewPage() {
  const data = useRouteData<Data>();
  const gate = () => data()?.gate ?? null;
  return (
    <Switch fallback={<Dashboard />}>
      <Match when={gate() === 'signed_out'}>
        <section class="hero">
          <h1>{() => t('gate.signedOut.title')}</h1>
          <p class="lead">{() => t('gate.signedOut.text')}</p>
          <Button variant="solid" class="wide" onPress={() => auth.signIn({ returnTo: '/' })}>
            {() => t('gate.signIn')}
          </Button>
        </section>
      </Match>
      <Match when={gate() === 'not_admin'}>
        <section class="narrow">
          <h1>{() => t('gate.notAdmin.title')}</h1>
          <p class="lead">{() => t('gate.notAdmin.text')}</p>
        </section>
      </Match>
      <Match when={gate() === 'mfa_required'}>
        <section class="narrow">
          <h1>{() => t('gate.mfa.title')}</h1>
          <p class="lead">{() => t('gate.mfa.text')}</p>
          <a class="button-link" href={`${idpUrl}/account`}>
            {() => t('gate.mfa.account')}
          </a>
        </section>
      </Match>
    </Switch>
  );
}

function Dashboard() {
  const data = useRouteData<Data>();
  const counts = () => data()?.overview;
  const tiles = [
    ['overview.pending', () => counts()?.pending_reviews ?? 0, '/reviews'],
    ['overview.users', () => counts()?.users ?? 0, '/users'],
    ['overview.developers', () => counts()?.developers ?? 0, '/users'],
    ['overview.projects', () => counts()?.projects ?? 0, '/projects'],
    ['overview.suspended', () => counts()?.suspended_projects ?? 0, '/projects'],
    ['overview.live', () => counts()?.live_apps ?? 0, '/projects'],
    ['overview.sandbox', () => counts()?.sandbox_apps ?? 0, '/projects'],
  ] as const;
  return (
    <section>
      <h1>{() => t('nav.overview')}</h1>
      <div class="stats">
        <For each={tiles}>
          {([key, value, href]) => (
            <Link href={href} class="stat" classList={{ attention: key === 'overview.pending' && value() > 0 }}>
              <span class="stat-value">{() => value()}</span>
              <span class="muted">{() => t(key)}</span>
            </Link>
          )}
        </For>
      </div>
      <Card class="panel">
        <CardBody>
          <h2>{() => t('reviews.title')}</h2>
          <Show when={(data()?.reviews ?? []).length} fallback={<p class="muted">{() => t('reviews.empty')}</p>}>
            <ul class="rows">
              <For each={data()?.reviews ?? []}>
                {(review) => (
                  <li>
                    <Link href="/reviews" class="row-link">
                      <strong>{review.name}</strong>
                      <span class="muted">{`${review.project?.name ?? ''} · ${review.owner?.email ?? ''}`}</span>
                    </Link>
                    <span class="muted">{review.sensitive_scopes.join(' ')}</span>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </CardBody>
      </Card>
    </section>
  );
}
