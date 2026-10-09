/** One app's review: what it asks for and why, its history, and the answer. */
import { Stack } from '@fluixi-ui/layout';
import { useNavigate, useRouteData, type RouteDataArgs } from '@fluixi/start/router';
import { useBrand } from '@idp/shell/brand';
import '@idp/elements/review-decision';
import { errorText, locale, t } from '../../lib/i18n.js';
import { reviewDecisionLabels } from '../../lib/labels.js';
import { paramOf } from '../../lib/params.js';
import type { Review, ScopeRow } from '../../lib/types.js';
import { paths } from '../../lib/paths.js';
import '@idp/elements/page-header';
import '@idp/elements/not-found';
import { review } from '../../data/admin.js';

export const routeData = (args: RouteDataArgs) => review(paramOf(args, 'clientId'));

export default function ReviewPage() {
  const data = useRouteData<{ review: Review | null; scopes: ScopeRow[] }>();
  const brand = useBrand();
  const navigate = useNavigate();
  return (
    <Show
      when={data()?.review}
      fallback={
        <idp-not-found href={paths.reviews()} labels={{ title: t('reviews.notFound'), text: '', back: t('reviews.back') }} />
      }
    >
      <Stack gap={5}>
        <idp-page-header
          title={data()?.review?.name ?? ''}
          intro={data()?.review?.client_id ?? ''}
          actions={[{ label: t('reviews.back'), href: paths.reviews(), variant: 'outline' }]}
        />
        <idp-review-decision
          review={data()?.review ?? null}
          scopes={data()?.scopes ?? []}
          platform={brand().name ?? ''}
          locale={locale()}
          labels={reviewDecisionLabels()}
          describe={errorText}
          onDecided={() => navigate(paths.reviews())}
        />
      </Stack>
    </Show>
  );
}
