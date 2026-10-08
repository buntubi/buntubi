/** The entrance: the counts, and the way to what needs an answer. */
import { cache, useRouteData } from '@fluixi/start/router';
import { Card, CardBody } from '@fluixi-ui/card';
import { t } from '../lib/i18n.js';
import { loadOverview } from '../server/admin.js';

const overview = cache(() => loadOverview(), 'overview');
export const routeData = () => overview();

type Data = Awaited<ReturnType<typeof loadOverview>>;

/** The gate is the root layout's; a visitor who reaches this page may use the console. */
export default function OverviewPage() {
  return (
    <div class="legacy">
      <Dashboard />
    </div>
  );
}

function Dashboard() {
  const data = useRouteData<Data>();
  const counts = () => data()?.overview;
  const tiles = [
    ['overview.pending', () => counts()?.pending_reviews ?? 0, '/reviews'],
    ['overview.users', () => counts()?.users ?? 0, '/users'],
    ['overview.developers', () => counts()?.developers ?? 0, '/users'],
    ['overview.organizations', () => counts()?.organizations ?? 0, '/organizations'],
    ['overview.suspended', () => counts()?.suspended_organizations ?? 0, '/organizations'],
    ['overview.live', () => counts()?.live_apps ?? 0, '/organizations'],
    ['overview.sandbox', () => counts()?.sandbox_apps ?? 0, '/organizations'],
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
                      <span class="muted">{`${review.organization?.name ?? ''} · ${review.owner?.email ?? ''}`}</span>
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
