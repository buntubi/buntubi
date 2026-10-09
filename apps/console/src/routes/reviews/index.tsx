/** The apps waiting for an answer, the longest waiting first. */
import { cache, useRouteData } from '@fluixi/start/router';
import '@idp/elements/review-queue';
import { t } from '../../lib/i18n.js';
import { reviewQueueLabels } from '../../lib/labels.js';
import type { Review } from '../../lib/types.js';
import { loadReviews } from '../../server/admin.js';

const reviews = cache(() => loadReviews(), 'reviews');
export const routeData = () => reviews();

export default function ReviewsPage() {
  const data = useRouteData<{ reviews: Review[]; now: string }>();
  return (
    <div class="stack">
      <header class="page-head">
        <div>
          <h1>{() => t('reviews.title')}</h1>
          <p class="page-intro">{() => t('reviews.intro')}</p>
        </div>
      </header>
      <idp-review-queue reviews={data()?.reviews ?? []} now={data()?.now ?? ''} href="/reviews/{client_id}" labels={reviewQueueLabels()} />
    </div>
  );
}
