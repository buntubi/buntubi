/** The entrance: the counts, and the way to what needs an answer. */
import { cache, useRouteData } from '@fluixi/start/router';
import '@idp/elements/review-waiting';
import '@idp/elements/stat-group';
import { t } from '../lib/i18n.js';
import { overviewStats, reviewWaitingLabels } from '../lib/labels.js';
import { loadOverview } from '../server/admin.js';

const overview = cache(() => loadOverview(), 'overview');
export const routeData = () => overview();

type Data = Awaited<ReturnType<typeof loadOverview>>;

/** The gate is the root layout's; a visitor who reaches this page may use the console. */
export default function OverviewPage() {
  const data = useRouteData<Data>();
  return (
    <div class="stack">
      <header class="page-head">
        <h1>{() => t('nav.overview')}</h1>
      </header>
      <idp-stat-group stats={overviewStats(data()?.overview ?? null)} />
      <idp-review-waiting reviews={data()?.reviews ?? []} href="/reviews/{client_id}" labels={reviewWaitingLabels()} />
    </div>
  );
}
