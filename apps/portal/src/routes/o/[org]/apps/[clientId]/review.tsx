/** An app's review: readiness, the submission, where it stands, and the history. */
import { Stack } from '@fluixi-ui/layout';
import { useRouteData, type RouteDataArgs } from '@fluixi/start/router';
import { can } from '@idp/sdk/roles';
import '@idp/elements/app-review';
import { appRouteData, type AppPageData } from '../../../../../data/developer.js';
import { errorText, locale, t } from '../../../../../lib/i18n.js';
import { appReviewLabels, fieldNames } from '../../../../../lib/labels.js';
import { paramOf } from '../../../../../lib/params.js';
import { checkLinks } from '../../../../../lib/paths.js';
import type { AppReview } from '../../../../../lib/types.js';
import '@idp/elements/page-header';
import { appReviews } from '../../../../../data/developer.js';


interface ReviewPageData extends AppPageData {
  reviews: AppReview[];
}

export const routeData = async (args: RouteDataArgs): Promise<ReviewPageData> => {
  const [page, history] = await Promise.all([appRouteData(args), appReviews(paramOf(args, 'clientId'))]);
  return { ...page, reviews: history };
};

export default function ReviewPage() {
  const data = useRouteData<ReviewPageData>();
  const app = () => data()?.app.app ?? null;
  return (
    <Stack gap={5}>
      <idp-page-header title={t('rv.title')} />
      <idp-app-review
        clientId={app()?.client_id ?? ''}
        overview={data()?.app.overview ?? null}
        reviews={data()?.reviews ?? []}
        products={data()?.workspace.products ?? []}
        links={checkLinks(app()?.organization_id ?? '', app()?.client_id ?? '')}
        canPublish={can(data()?.app.role, 'publish')}
        fields={fieldNames()}
        locale={locale()}
        labels={appReviewLabels()}
        describe={errorText}
      />
    </Stack>
  );
}
