/** The apps waiting for an answer, the longest waiting first. */
import { Stack } from '@fluixi-ui/layout';
import { useRouteData } from '@fluixi/start/router';
import '@idp/elements/review-queue';
import { t } from '../../lib/i18n.js';
import { reviewQueueLabels } from '../../lib/labels.js';
import type { Review } from '../../lib/types.js';
import { paths } from '../../lib/paths.js';
import '@idp/elements/page-header';
import { reviews } from '../../data/admin.js';

export const routeData = () => reviews();

export default function ReviewsPage() {
  const data = useRouteData<{ reviews: Review[]; now: string }>();
  return (
    <Stack gap={5}>
      <idp-page-header title={t('reviews.title')} intro={t('reviews.intro')} />
      <idp-review-queue reviews={data()?.reviews ?? []} now={data()?.now ?? ''} href={paths.reviewPattern()} labels={reviewQueueLabels()} />
    </Stack>
  );
}
