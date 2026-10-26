/** The entrance: the counts, and the way to what needs an answer. */
import { Stack } from '@fluixi-ui/layout';
import { useRouteData } from '@fluixi/start/router';
import '@idp/elements/review-waiting';
import '@idp/elements/stat-group';
import '@idp/elements/sign-in-settings';
import { t } from '../lib/i18n.js';
import { overviewStats, reviewWaitingLabels, signInSettingsLabels } from '../lib/labels.js';
import { paths } from '../lib/paths.js';
import '@idp/elements/page-header';
import { overview } from '../data/admin.js';

export const routeData = () => overview();

type Data = Awaited<ReturnType<typeof overview>>;

/** The gate is the root layout's; a visitor who reaches this page may use the console. */
export default function OverviewPage() {
  const data = useRouteData<Data>();
  return (
    <Stack gap={5}>
      <idp-page-header title={t('nav.overview')} />
      <idp-stat-group stats={overviewStats(data()?.overview ?? null)} />
      <idp-review-waiting reviews={data()?.reviews ?? []} href={paths.reviewPattern()} labels={reviewWaitingLabels()} />
      <idp-sign-in-settings settings={data()?.overview?.sign_in ?? null} labels={signInSettingsLabels()} />
    </Stack>
  );
}
