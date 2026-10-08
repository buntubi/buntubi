/** One app's review: what it asks for and why, its history, and the answer. */
import { cache, useNavigate, useRouteData, type RouteDataArgs } from '@fluixi/start/router';
import { useBrand } from '@idp/shell/brand';
import '@idp/elements/review-decision';
import { errorText, locale, t } from '../../lib/i18n.js';
import { reviewDecisionLabels } from '../../lib/labels.js';
import { paramOf } from '../../lib/params.js';
import type { Review, ScopeRow } from '../../lib/types.js';
import { loadReview } from '../../server/admin.js';

const review = cache((clientId: string) => loadReview(clientId), 'review');
export const routeData = (args: RouteDataArgs) => review(paramOf(args, 'clientId'));

export default function ReviewPage() {
  const data = useRouteData<{ review: Review | null; scopes: ScopeRow[] }>();
  const brand = useBrand();
  const navigate = useNavigate();
  return (
    <Show
      when={data()?.review}
      fallback={
        <div class="stack">
          <h1>{() => t('reviews.notFound')}</h1>
          <Link href="/reviews">{() => t('reviews.back')}</Link>
        </div>
      }
    >
      <div class="stack">
        <header class="page-head">
          <div>
            <p class="eyebrow">
              <Link href="/reviews">{() => t('reviews.back')}</Link>
            </p>
            <h1>{() => data()?.review?.name ?? ''}</h1>
            <p class="page-intro mono">{() => data()?.review?.client_id ?? ''}</p>
          </div>
        </header>
        <dp-review-decision
          review={data()?.review ?? null}
          scopes={data()?.scopes ?? []}
          platform={brand().name ?? ''}
          locale={locale()}
          labels={reviewDecisionLabels()}
          describe={errorText}
          onDecided={() => navigate('/reviews')}
        />
      </div>
    </Show>
  );
}
