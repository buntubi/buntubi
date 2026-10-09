/** An app's review: readiness, the submission, where it stands, and the history. */
import { cache, useRouteData, type RouteDataArgs } from '@fluixi/start/router';
import { can } from '@idp/sdk/roles';
import '@idp/elements/app-review';
import { appRouteData, type AppPageData } from '../../../../../lib/app-route.js';
import { errorText, locale, t } from '../../../../../lib/i18n.js';
import { appReviewLabels, launchPathLabels } from '../../../../../lib/labels.js';
import { paramOf } from '../../../../../lib/params.js';
import { appPath } from '../../../../../lib/paths.js';
import type { AppReview } from '../../../../../lib/types.js';
import { loadAppReviews } from '../../../../../server/developer.js';

const reviews = cache((clientId: string) => loadAppReviews(clientId), 'reviews');

interface ReviewPageData extends AppPageData {
  reviews: AppReview[];
}

export const routeData = async (args: RouteDataArgs): Promise<ReviewPageData> => {
  const [page, history] = await Promise.all([appRouteData(args), reviews(paramOf(args, 'clientId'))]);
  return { ...page, reviews: history };
};

export default function ReviewPage() {
  const data = useRouteData<ReviewPageData>();
  const app = () => data()?.app.app ?? null;
  const section = (name: string) => appPath(app()?.organization_id ?? '', app()?.client_id ?? '', name);
  return (
    <div class="stack">
      <style scoped>{`h2 { margin: 0; font-size: 18px; font-weight: 600; }`}</style>
      <h2>{() => t('rv.title')}</h2>
      <idp-app-review
        clientId={app()?.client_id ?? ''}
        overview={data()?.app.overview ?? null}
        reviews={data()?.reviews ?? []}
        products={data()?.workspace.products ?? []}
        links={{
          basic_info: section('settings'),
          policies: section('settings'),
          redirect_uri: section('credentials'),
          products: section('permissions'),
          permissions: section('permissions'),
          support_email: `/o/${app()?.organization_id ?? ''}/settings`,
        }}
        canPublish={can(data()?.app.role, 'publish')}
        fields={launchPathLabels().fields}
        locale={locale()}
        labels={appReviewLabels()}
        describe={errorText}
      />
    </div>
  );
}
